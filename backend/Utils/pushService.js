// utils/pushService.js
const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:your@email.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function sendPushNotification(subscription, payload) {
  console.log("inside sendPushNotification")
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = { sendPushNotification };

