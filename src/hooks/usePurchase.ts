import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { unlock as unlockStorage } from '../utils/storage';

// IAP product ID — configure this in App Store Connect
const PRODUCT_ID = 'com.thirty.unlimited';

// react-native-iap requires native setup. This hook provides the interface;
// actual IAP calls are wrapped in try/catch so the app works in development
// without the native module configured.

export function usePurchase() {
  const [purchasing, setPurchasing] = useState(false);

  const purchase = useCallback(async (): Promise<boolean> => {
    setPurchasing(true);
    try {
      const RNIap = require('react-native-iap');
      await RNIap.initConnection();
      const products = await RNIap.getProducts({ skus: [PRODUCT_ID] });

      if (products.length === 0) {
        Alert.alert('Unavailable', 'Purchase is not available right now.');
        setPurchasing(false);
        return false;
      }

      await RNIap.requestPurchase({ sku: PRODUCT_ID });
      await unlockStorage();
      setPurchasing(false);
      return true;
    } catch (e: any) {
      if (e.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
      setPurchasing(false);
      return false;
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setPurchasing(true);
    try {
      const RNIap = require('react-native-iap');
      await RNIap.initConnection();
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
