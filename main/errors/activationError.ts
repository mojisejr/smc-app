export enum ActivationErrorCode {
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  HARDWARE_MISMATCH = 'HARDWARE_MISMATCH',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}

export class ActivationError extends Error {
  public readonly code: ActivationErrorCode;

  constructor(code: ActivationErrorCode, message?: string) {
    const defaultMessages = {
      [ActivationErrorCode.INVALID_FILE_FORMAT]: 'รูปแบบไฟล์ license.json ไม่ถูกต้อง',
      [ActivationErrorCode.INVALID_SIGNATURE]: 'ลิขสิทธิ์ไม่ถูกต้องหรือถูกแก้ไข',
      [ActivationErrorCode.LICENSE_EXPIRED]: 'ลิขสิทธิ์หมดอายุแล้ว กรุณาติดต่อทีมสนับสนุนเพื่อต่ออายุ',
      [ActivationErrorCode.HARDWARE_MISMATCH]: 'ลิขสิทธิ์นี้ไม่สามารถใช้กับเครื่องนี้ได้',
      [ActivationErrorCode.UNEXPECTED_ERROR]: 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
    };

    super(message || defaultMessages[code]);
    this.code = code;
    this.name = 'ActivationError';
  }
}