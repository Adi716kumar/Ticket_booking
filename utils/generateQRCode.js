const QRCode = require("qrcode");

const generateQRCode = async (bookingReference) => {

    const qr = await QRCode.toDataURL(bookingReference);

    return qr;
};

module.exports = generateQRCode;