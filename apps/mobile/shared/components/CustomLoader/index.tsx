import React, { useRef } from 'react';
import LottieView from 'lottie-react-native';
import { Image } from 'react-native';
import white from '../../../assets/white-loader.lottie';
import green from '../../../assets/green-loader.lottie';

const SIZE_MAP = {
  sm: 25,
  md: 40,
  lg: 50,
} as const;

type Props = {
  isReversed?: boolean;
  size?: keyof typeof SIZE_MAP;
};

export function CustomLoader({ isReversed, size = 'md' }: Props) {
  const animation = useRef<LottieView>(null);
  const sourceAsset = Image.resolveAssetSource(isReversed ? green : white);
  const loaderSize = SIZE_MAP[size];

  return (
    <LottieView
      autoPlay
      ref={animation}
      style={{
        width: loaderSize,
        height: loaderSize,
      }}
      source={{ uri: sourceAsset.uri }}
    />
  );
}