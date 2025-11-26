/* eslint-disable no-console */
// A local Node.js script to run a Secret Santa draw and email participants.
require('dotenv').config();
const nodemailer = require('nodemailer');
const { participants } = require('./config.js');

const YOUR_EMAIL = process.env.GMAIL_USER;
const YOUR_APP_PASSWORD = process.env.GMAIL_APP_PASS;

const args = process.argv.slice(2);

const DRY_RUN = args.includes('--dry-run') || args.includes('-d') ? true : false;
const groups_on = args.includes('--groups') || args.includes('-g') ? true : false;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  🎅 Secret Santa Script 🎅

  This script runs a Secret Santa draw and emails the results to participants.

  Usage:
    node santa.js [options]

  Options:
    -d, --dry-run       Run the script without sending any emails.
                        (Prints assignments to the console)
    
    -g, --group-check   Enable the group exclusion rule.
                        (Prevents people in the same 'group' from
                        being assigned to each other)
    
    -h, --help          Show this help menu.
  `);
  process.exit(0); // <-- This is key! It stops the script immediately.
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array<any>} array Array to shuffle.
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Creates the Secret Santa assignments.
 * @returns {Array<{giver: {name: string, email: string}, receiver: {name: string, email: string}}>}
 */
function createAssignments() {
  console.log('Creating assignments...');
  const givers = [...participants];
  let receivers = [...participants];
  let hasInvalidAssignment = true;
  let attempts = 0;

  while (hasInvalidAssignment) {
    attempts++;
    console.log(`Attempt ${attempts}: Shuffling receivers...`);

    receivers = [...participants];
    shuffle(receivers); 

    hasInvalidAssignment = false;

    for (let i = 0; i < givers.length; i++) {
      const giver = givers[i];
      const receiver = receivers[i];

      if (DRY_RUN) console.log(`Checking assignment: ${giver.name} -> ${receiver.name}`);

      // rule 1 can't get yourself
      if (giver.uid === receiver.uid) {
        console.log(`...Self-assignment found for ${giver.name}. Re-shuffling entire list.`);
        hasInvalidAssignment = true; 
        break;
      }

      if (groups_on) {
        // rule 2 can't get someone in your group
        if (giver.group && receiver.group && giver.group === receiver.group) {
          console.log(`...Group conflict: ${giver.name} (${giver.group}) can't get ${receiver.name} (${receiver.group}). Re-shuffling.`);
          hasInvalidAssignment = true;
          break;
        }
      }
    }
  }

  const assignments = [];
  for (let i = 0; i < givers.length; i++) {
    assignments.push({
      giver: givers[i],
      receiver: receivers[i],
    });
  }

  console.log(`Assignments created successfully after ${attempts} attempt(s).`);
  return assignments;
}

/**
 * Sends the email notifications.
 * @param {Array<any>} assignments
 */
async function sendEmails(assignments) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: YOUR_EMAIL,
      pass: YOUR_APP_PASSWORD,
    },
  });

  console.log('\n--- Sending Emails ---');

  for (const assignment of assignments) {
    const { giver, receiver } = assignment;

    const mailOptions = {
      from: `"Secret Santa Bot" <${YOUR_EMAIL}>`,
      to: giver.email,
      subject: 'Your Secret Santa Assignment is Here! 🎅',
      text: `Hi ${giver.name}!\n\nYou are the Secret Santa for...\n\n** ${receiver.name} **\n\nShhhh, it's a secret!\n\nHappy holidays!`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hi ${giver.name}!</h2>
          <p>Your Secret Santa assignment is here! 🎄</p>
          <p>You are the Secret Santa for...</p>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 10px; background-color: #f4f4f4; border-radius: 5px;">
            ${receiver.name}
          </div>
          <p>Shhhh, it's a secret!</p>
          <p>Happy holidays,<br>The Secret Santa Bot 🤖</p>
          <p>-P.S. This probably isn't a scam but if you want to be sure respond to this email with your SSN and/or bank PIN.  Please and thank you!</p>
        </div>
      `,
    };

    if (DRY_RUN) {
      console.log(`(DRY RUN) Would email ${giver.name} (${giver.email}): "You got ${receiver.name}"`);
    } else {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${giver.name}`);
      } catch (error) {
        console.error(`❌ Error sending email to ${giver.name}: ${error.message}`);
      }
    }
  }
}

/**
 * Main function to run the script.
 */
async function main() {
  if (participants.length < 2) {
    console.error('Error: You need at least 2 participants for a Secret Santa.');
    return;
  }
  
  if (DRY_RUN) {
    console.log('******************************');
    console.log('* RUNNING IN DRY MODE    *');
    console.log('* No emails will be sent.   *');
    console.log('******************************\n');
  }

  const assignments = createAssignments();
  await sendEmails(assignments);

  console.log('\nAll done!');
}

// Run the app
main().catch(console.error);