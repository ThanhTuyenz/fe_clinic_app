import { Image, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'

export default function SplashScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="VitaCare Clinic" />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: '88%',
    maxWidth: 340,
    height: 168,
  },
})
