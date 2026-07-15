const {
    createBookingService,
    cancelBookingService,
    getMyBookingsService
} = require("../services/bookingService");

exports.createBooking = async (req, res) => {

    try {
        const { eventId, seatIds } = req.body;

        const userId = req.user._id;

        const booking =
            await createBookingService({ userId,
                        eventId,
                        seatIds});

        res.status(201).json({
            success: true,
            booking,
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

exports.cancelBooking = async(req,res)=>{

    try{

        const booking =
        await cancelBookingService(
            req.params.id,
            req.user._id
        );

        res.json({
            success:true,
            booking
        });

    }catch(error){

        res.status(400).json({
            success:false,
            message:error.message
        });

    }

}

exports.getMyBookings = async (req, res) => {

    try {

        // For now, until auth middleware is applied everywhere
        const { userId } = req.query;

        const bookings = await getMyBookingsService(userId);

        res.json({
            success: true,
            bookings
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};