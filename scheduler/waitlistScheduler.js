const cron = require("node-cron");
const Waitlist = require("../models/Waitlist");
const ShowSeat = require("../models/ShowSeat");

cron.schedule("* * * * *", async () => {

    try {

        const expiredOffers = await Waitlist.find({
            status: "Offered",
            offerExpiresAt: { $lte: new Date() }
        });

        for (const offer of expiredOffers) {

            // Release seats held for this user
            await ShowSeat.updateMany(
                {
                    _id: { $in: offer.offeredSeats }
                },
                {
                    $set: {
                        status: "Available",
                        heldBy: null,
                        holdExpiresAt: null
                    }
                }
            );

            // Mark current offer expired
            offer.status = "Expired";
            await offer.save();

            // Find next waiting user
            const nextUser = await Waitlist.findOne({
                event: offer.event,
                category: offer.category,
                status: "Waiting"
            }).sort({ createdAt: 1 });

            if (nextUser) {

                nextUser.status = "Offered";

                nextUser.offeredSeats = offer.offeredSeats;

                nextUser.offerExpiresAt =
                    new Date(Date.now() + 10 * 60 * 1000);

                await nextUser.save();

                // Hold seats for next user
                await ShowSeat.updateMany(
                    {
                        _id: { $in: offer.offeredSeats }
                    },
                    {
                        $set: {
                            status: "Held",
                            heldBy: nextUser.user,
                            holdExpiresAt: nextUser.offerExpiresAt
                        }
                    }
                );

            }

        }

    } catch (error) {

        console.log(error);

    }

});