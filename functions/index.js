const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

exports.notifyOnRsvp = onDocumentCreated(
  {
    document: "vee-first-birthday-rsvps/{docId}",
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const data = event.data.data();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "tsomda@gmail.com",
        pass: gmailAppPassword.value(),
      },
    });

    const poolLine = data.joiningPool
      ? `Pool: yes — ${(data.poolNames || []).join(", ")}`
      : "Pool: no";

    await transporter.sendMail({
      from: "tsomda@gmail.com",
      to: "tsomda@gmail.com, priangulo@gmail.com",
      subject: `New RSVP: ${data.rsvpName}`,
      text: [
        `Name: ${data.rsvpName}`,
        `Adults: ${data.adultsCount}`,
        `Kids: ${data.kidsCount}`,
        poolLine,
        data.phone ? `Phone: ${data.phone}` : null,
        data.email ? `Email: ${data.email}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
);
