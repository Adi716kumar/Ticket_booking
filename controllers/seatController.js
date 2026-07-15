const {

    getSeatMapService,
    holdSeatsService,
    bookSeatsService

} = require("../services/seatService");


exports.getSeatMap = async (req,res)=>{

    try{

        const seats =
        await getSeatMapService(req.params.eventId);

        res.json({
            success:true,
            seats
        });

    }catch(err){

        res.status(400).json({
            success:false,
            message:err.message
        });

    }

}


exports.holdSeats = async (req, res) => {

    try {

        const { seatIds } = req.body;
        const userId = req.user._id;

        const data = await holdSeatsService(
            seatIds,
            userId
        );

        res.json({
            success: true,
            ...data,
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

exports.bookSeats = async(req,res)=>{}