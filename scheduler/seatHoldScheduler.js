const cron = require("node-cron");
const ShowSeat = require("../models/ShowSeat");

cron.schedule("* * * * *", async () => {

    try {

        const result = await ShowSeat.updateMany(
            {
                status: "Held",
                holdExpiresAt: { $lte: new Date() }
            },
            {
                $set: {
                    status: "Available",
                    heldBy: null,
                    holdExpiresAt: null
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`${result.modifiedCount} seats released.`);
        }

    } catch (error) {
        console.log(error.message);
    }

});