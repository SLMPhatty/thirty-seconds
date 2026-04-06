// Copyright © 2018 650 Industries. All rights reserved.
// Compatibility shim — this protocol was removed in expo-modules-core@55
// but is still referenced by expo-av@15.x

#import <Foundation/Foundation.h>

@protocol EXEventEmitter <NSObject>

- (void)startObserving;
- (void)stopObserving;
- (NSArray<NSString *> *)supportedEvents;

@end
