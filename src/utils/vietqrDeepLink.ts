import { Linking } from 'react-native'

export interface BankAppItem {
  id: string // vietqr app id
  name: string // Full bank name
  shortName: string // Short name
  bin: string // Napas BIN code
  scheme: string // URL scheme for mobile app
  iconUrl: string
  color: string
}

/**
 * Các ngân hàng phổ biến được ưu tiên hiển thị trước trong danh sách mở nhanh.
 */
export const POPULAR_BANKS: BankAppItem[] = [
  {
    id: 'mb',
    name: 'MBBank',
    shortName: 'MB Bank',
    bin: '970422',
    scheme: 'mbmobile://',
    iconUrl: 'https://api.vietqr.io/img/MB.png',
    color: '#002B7F',
  },
  {
    id: 'vcb',
    name: 'Vietcombank',
    shortName: 'VCB Digibank',
    bin: '970436',
    scheme: 'vcbdigibank://',
    iconUrl: 'https://api.vietqr.io/img/VCB.png',
    color: '#138035',
  },
  {
    id: 'tcb',
    name: 'Techcombank',
    shortName: 'Techcombank',
    bin: '970407',
    scheme: 'tcb://',
    iconUrl: 'https://api.vietqr.io/img/TCB.png',
    color: '#EC1C24',
  },
  {
    id: 'vba',
    name: 'Agribank Plus',
    shortName: 'Agribank',
    bin: '970405',
    scheme: '',
    iconUrl: 'https://cdn.vietqr.io/img/VBA.png',
    color: '#A11D36',
  },
  {
    id: 'icb',
    name: 'VietinBank',
    shortName: 'VietinBank iPay',
    bin: '970415',
    scheme: 'vietinbankipay://',
    iconUrl: 'https://api.vietqr.io/img/ICB.png',
    color: '#00529C',
  },
  {
    id: 'bidv',
    name: 'BIDV',
    shortName: 'BIDV SmartBanking',
    bin: '970418',
    scheme: 'bidvsmartbanking://',
    iconUrl: 'https://api.vietqr.io/img/BIDV.png',
    color: '#006B49',
  },
  {
    id: 'vpb',
    name: 'VPBank',
    shortName: 'VPBank NEO',
    bin: '970432',
    scheme: 'vpbankneo://',
    iconUrl: 'https://api.vietqr.io/img/VPB.png',
    color: '#008C44',
  },
  {
    id: 'tpb',
    name: 'TPBank',
    shortName: 'TPBank Mobile',
    bin: '970423',
    scheme: 'tpbank://',
    iconUrl: 'https://api.vietqr.io/img/TPB.png',
    color: '#6F2C91',
  },
  {
    id: 'acb',
    name: 'ACB',
    shortName: 'ACB ONE',
    bin: '970416',
    scheme: 'acbone://',
    iconUrl: 'https://api.vietqr.io/img/ACB.png',
    color: '#0066B3',
  },
]

export interface PayosPaymentInfo {
  bin?: string
  accountNumber?: string
  accountName?: string
  amount: number
  description: string
  qrCode?: string
  checkoutUrl?: string
}

/**
 * Sinh đường dẫn Universal Deep Link chuẩn VietQR
 */
export function buildVietQrUniversalLink(
  appId: string,
  data: {
    bin?: string
    accountNumber?: string
    amount: number
    description: string
  }
): string {
  const bin = data.bin || '970422'
  const account = data.accountNumber || ''
  const amount = data.amount || 0
  const desc = encodeURIComponent(data.description || '')

  return `https://dl.vietqr.io/pay?app=${appId}&ba=${account}&bn=${bin}&am=${amount}&tn=${desc}`
}

/**
 * Mở ứng dụng ngân hàng thông qua Universal Link hoặc Custom Scheme
 */
export async function openBankApp(
  bank: BankAppItem,
  data: PayosPaymentInfo
): Promise<boolean> {
  const universalUrl = buildVietQrUniversalLink(bank.id, {
    bin: data.bin,
    accountNumber: data.accountNumber,
    amount: data.amount,
    description: data.description,
  })

  try {
    // Thử mở qua Universal Deep Link chuẩn VietQR
    const canOpenUniversal = await Linking.canOpenURL(universalUrl)
    if (canOpenUniversal) {
      await Linking.openURL(universalUrl)
      return true
    }

    // Fallback thử mở URL Scheme nếu có
    if (bank.scheme) {
      const canOpenScheme = await Linking.canOpenURL(bank.scheme)
      if (canOpenScheme) {
        await Linking.openURL(bank.scheme)
        return true
      }
    }

    // Fallback: Mở trình duyệt với link VietQR
    await Linking.openURL(universalUrl)
    return true
  } catch {
    // Nếu thiết bị không mở được, mở link checkoutUrl của PayOS
    if (data.checkoutUrl) {
      try {
        await Linking.openURL(data.checkoutUrl)
        return true
      } catch {}
    }
    return false
  }
}
