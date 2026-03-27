declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.svg' {
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}

declare module '*.webp' {
  const value: number;
  export default value;
}
