import React from 'react';
import ActionSheet from 'react-native-actions-sheet';
import { View, Text } from 'react-native';

const ExampleSheet = () => {
  return (
    <ActionSheet gestureEnabled>
      <View>
        <Text>Hello World</Text>
      </View>
    </ActionSheet>
  );
};

export default ExampleSheet;
