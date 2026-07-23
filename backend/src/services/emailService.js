import env from '../config/env.js';

/**
 * Send an email containing the invitation details and accept token.
 * For MVP/local development: Logs the link clearly to the server console.
 * 
 * @param {object} params
 * @param {string} params.email - Invitee email
 * @param {string} params.fullName - Invitee name
 * @param {string} params.ownerName - Name of the vault owner sending the invite
 * @param {string} params.relationship - Relationship assigned (e.g. spouse, child)
 * @param {string} params.role - Primary role (e.g. legacy_recipient)
 * @param {string} params.rawToken - Plaintext cryptographically random invitation token
 * @returns {Promise<string>} Generated raw invitation link
 */
export async function sendInvitationEmail({ email, fullName, ownerName, relationship, role, rawToken, vaultId, trustedPersonId }) {
  const acceptUrl = `${env.clientUrl}/trusted-invite/accept?token=${rawToken}&vaultId=${vaultId}&id=${trustedPersonId}`;

  console.log('\n==================================================');
  console.log('   ✉️  LEGACYOS OUTBOUND INVITATION EMAIL (DEVELOPMENT)');
  console.log('==================================================');
  console.log(`To:             ${fullName} <${email}>`);
  console.log(`From:           LegacyOS System`);
  console.log(`Subject:        You've been designated as a Trusted Person by ${ownerName}`);
  console.log('--------------------------------------------------');
  console.log(`Hello ${fullName},`);
  console.log(`\n${ownerName} has invited you to become a Trusted Person for their Digital Legacy.`);
  console.log(`They have designated your relationship as "${relationship}" and assigned you the role of "${role}".`);
  console.log('\nTo accept this invitation and link it to your account, please visit:');
  console.log(`👉 ${acceptUrl}`);
  console.log('\nNote: This link is valid for 7 days and can only be accepted once.');
  console.log('==================================================\n');

  return acceptUrl;
}
