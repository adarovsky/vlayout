export default class SessionControlUtils  {

  static isEmailValid(email: string) {
    return /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[A-Za-z]+$/.test(email);
  }

  // checks if phone number (without prefix) valid
  static isPhoneNumberValid(phoneNumber: string) {
    return /[0-9]+/.test(phoneNumber);
  }

  // checks if url is valid (https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url/49849482)
  static isUrlValid(url: string) {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

    return pattern.test(url);
  }
}
