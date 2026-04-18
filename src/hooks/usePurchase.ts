import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { unlock as unlockStorage } from '../utils/storage';

// IAP product ID — must match App Store Connect configuration
const PRODUCT_ID = 'thirty.lifetime.unlock';

// react-native-iap v14+ API — uses purchaseUpdatedListener / purchaseErrorListener
// pattern with finishTransaction() for proper transaction lifecycle.

export function usePurchase() {
  const [purchasing, setPurchasing] = useState(false);
  const listenersRef = useRef<{ remove: () => void }[]>([]);
  const pendingPurchaseRef = useRef<{
    resolve: (value: boolean) => void;
    settled: boolean;
  } | null>(null);

  const settlePendingPurchase = useCallback((value: boolean) => {
    const pending = pendingPurchaseRef.current;
    if (!pending || pending.settled) return;
    pending.settled = true;
    pendingPurchaseRef.current = null;
    pending.resolve(value);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const RNIap = require('react-native-iap');
        await RNIap.initConnection();

        // Listen for successful purchases
        const purchaseListener = RNIap.purchaseUpdatedListener(
          async (purchase: any) => {
            if (!mounted) return;
            if (purchase.productId === PRODUCT_ID) {
              try {
                // Finish the transaction — required by Apple/Google before unlocking
                await RNIap.finishTransaction({ purchase, isConsumable: false });
                await unlockStorage();
                settlePendingPurchase(true);
                if (mounted) setPurchasing(false);
              } catch (e) {
                console.warn('Failed to finish transaction:', e);
                settlePendingPurchase(false);
                if (mounted) {
                  setPurchasing(false);
                  Alert.alert('Error', 'Purchase succeeded but failed to activate. Please tap "restore purchase".');
                }
              }
            }
          }
        );

        // Listen for purchase errors
        const errorListener = RNIap.purchaseErrorListener((error: any) => {
          if (!mounted) return;
          if (error.code !== 'E_USER_CANCELLED') {
            Alert.alert('Error', 'Something went wrong. Please try again.');
          }
          settlePendingPurchase(false);
          setPurchasing(false);
        });

        listenersRef.current = [purchaseListener, errorListener];
      } catch {
        // react-native-iap not available (e.g. Expo Go / development)
      }
    })();

    return () => {
      mounted = false;
      settlePendingPurchase(false);
      for (const listener of listenersRef.current) {
        listener.remove();
      }
      listenersRef.current = [];
      try {
        const RNIap = require('react-native-iap');
        RNIap.endConnection();
      } catch {
        // ignore
      }
    };
  }, [settlePendingPurchase]);

  const purchase = useCallback(async (): Promise<boolean> => {
    setPurchasing(true);
    try {
      const RNIap = require('react-native-iap');

      // v14 API: fetchProducts (not getProducts)
      const products = await RNIap.fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });

      if (!products || products.length === 0) {
        Alert.alert('Unavailable', 'Purchase is not available right now.');
        setPurchasing(false);
        return false;
      }

      const result = new Promise<boolean>((resolve) => {
        pendingPurchaseRef.current = { resolve, settled: false };
      });

      // v14 API: platform-specific request format
      await RNIap.requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: { skus: [PRODUCT_ID] },
        },
        type: 'in-app',
      });
      // Transaction completion is confirmed by purchaseUpdatedListener above.
      return await result;
    } catch (e: any) {
      if (e.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
      settlePendingPurchase(false);
      setPurchasing(false);
      return false;
    }
  }, [settlePendingPurchase]);

  const restore = useCallback(async (): Promise<boolean> => {
    setPurchasing(true);
    try {
      const RNIap = require('react-native-iap');
      const purchases = await RNIap.getAvailablePurchases();
      const found = purchases.some(
        (p: any) => p.productId === PRODUCT_ID
      );

      if (found) {
        await unlockStorage();
        Alert.alert('Restored', 'Your purchase has been restored.');
        setPurchasing(false);
        return true;
      } else {
        Alert.alert('Not Found', 'No previous purchase found.');
        setPurchasing(false);
        return false;
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
      setPurchasing(false);
      return false;
    }
  }, []);

  return { purchase, restore, purchasing };
}
