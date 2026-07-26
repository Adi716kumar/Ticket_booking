const QRCode = require("qrcode");

// Encodes just the booking reference — keeps the QR payload small and
// lets the venue-side scanner look up the full booking server-side rather
// than trusting whatever's encoded in the image.
async function generateQRCode(bookingReference) {
  return QRCode.toDataURL(bookingReference);
}

module.exports = generateQRCode;
