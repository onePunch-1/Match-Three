// emptyMovesModal.tsx
import LottieView from 'lottie-react-native';
import React from 'react';
import { View, Text, Modal, Image } from 'react-native';

interface Props {
  visible: boolean;
  modalStyle?: object;
  heading: string;
  headingStyle?: object;
  subHeading?: string;
  subHeadingStyle?: object;
  description?: string;
  descriptionStyle?: object;
  lottieImage?: any;
  lottieStyle?: object;
}

const EmptyMovesModal: React.FC<Props> = ({
  visible,
  modalStyle,
  heading,
  headingStyle,
  subHeading,
  subHeadingStyle,
  description,
  descriptionStyle,
  lottieImage,
  lottieStyle,
}) => {
  return (
    <Modal transparent={true} animationType="fade" visible={visible}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}
      >
        <View
          style={[
            modalStyle,
            {
              borderRadius: 16,
              alignItems: 'center',
            },
          ]}
        >
          <Text style={headingStyle}>{heading}</Text>
          <Text style={subHeadingStyle}>{subHeading}</Text>
          <LottieView style={lottieStyle} source={lottieImage} autoPlay loop />
          <Text style={descriptionStyle}>{description}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default EmptyMovesModal;
