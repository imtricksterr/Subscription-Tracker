import dayjs from 'dayjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { serve } = require('@upstash/workflow/express');
import { SERVER_URL } from '../config/env.js';
import Subscription from '../models/subscription.model.js';
import { sendReminderEmail } from '../utils/send-email.js';

const REMINDERS = [7, 5, 2, 1];

export const sendReminders = serve(async (context) => {
    const { subscriptionId } = context.requestPayload;
    console.log('sendReminders called for:', subscriptionId);
    const subscription = await fetchSubscription(context, subscriptionId);

    console.log('subscription:', subscription);
    console.log('subscription status:', subscription?.status);
    if(!subscription || subscription.status !== 'active') {
        console.log('stopping - subscription not active');
        return; 
    }

    const renewalDate = dayjs(subscription.renewalDate);
    console.log('renewalDate:', renewalDate.format());
    console.log('is before now:', renewalDate.isBefore(dayjs()));

    if(renewalDate.isBefore(dayjs())) {
        console.log(`Renewal date has passed for subscription ${subscription}. Stopping workflow`);
        return;
    }

    for (const daysBefore of REMINDERS) {
        const reminderDate = renewalDate.subtract(daysBefore, 'day');
        console.log(`daysBefore: ${daysBefore}, reminderDate: ${reminderDate.format()}, isAfter: ${reminderDate.isAfter(dayjs())}, isSame: ${dayjs().isSame(reminderDate, 'day')}`)

        if(reminderDate.isAfter(dayjs())) {
            await sleepUntilReminder(context, `${daysBefore} days before reminder`, reminderDate);
        }

        if(dayjs().isSame(reminderDate, 'day')) {
            await triggerReminder(context, `Reminder ${daysBefore} days before`, subscription);
        }
    }
}, {
    baseUrl: SERVER_URL,
});

const fetchSubscription = async (context, subscriptionId) => {
    return await context.run('get subscription', async () => {
        return Subscription.findById(subscriptionId).populate('user', 'name email').lean();
    })
}

const sleepUntilReminder = async (context, label, date) => {
    console.log(`Sleeping until ${label} reminder at ${date}`);
    await context.sleepUntil(label, date.toDate());
}

const triggerReminder = async (context, label, subscription) => {
    return await context.run(label, async () => {
        console.log(`Triggering ${label} reminder`);

        await sendReminderEmail({
            to: subscription.user.email,
            type: label,
            subscription,
        })
    })
}
