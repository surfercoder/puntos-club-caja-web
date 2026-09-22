import type { es } from './es';

// Tipado contra `es`: si falta una clave o sobra una que no existe alla, el
// type-check falla. Ese es el chequeo que pide el ticket ("en los dos archivos
// de recursos") y no depende de que alguien se acuerde de mirar.
export const en: Record<keyof typeof es, string> = {
  // --- Common --------------------------------------------------------------
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.error': 'Error',
  'common.done': 'Done',
  'common.understood': 'Got it',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.pts': 'pts',
  'common.points': 'points',
  'common.point': 'point',
  'common.noOrganization': 'No organization',
  'common.cashier': 'Cashier',
  'common.client': 'Customer',
  'common.user': 'User',
  'common.active': 'Active',
  'common.inactive': 'Inactive',
  'common.noDate': 'No date',

  // --- Errors --------------------------------------------------------------
  'error.unexpected': 'Something went wrong. Please try again.',
  'error.network':
    "We couldn't connect. Check your internet connection and try again.",

  'error.auth.invalidCredentials':
    'That email or password is not correct. Check them and try again.',
  'error.auth.emailNotConfirmed':
    "You haven't confirmed your email yet. Open the message we sent you and tap the link to activate your account.",
  'error.auth.emailExists': 'An account with that email already exists.',
  'error.auth.weakPassword':
    'That password is too weak. Use at least 6 characters mixing letters and numbers.',
  'error.auth.samePassword':
    'Your new password has to be different from the current one.',
  'error.auth.emailInvalid': "That email isn't valid. Check how you typed it.",
  'error.auth.validationFailed':
    'Some details are missing or invalid. Check the form and try again.',
  'error.auth.signupDisabled':
    'Sign-up is unavailable right now. Please try again later.',
  'error.auth.userBanned':
    'This account is suspended. Contact your administrator.',
  'error.auth.userNotFound': "We couldn't find an account with that email.",
  'error.auth.linkExpired':
    'That link expired or was already used. Request a new one and try again.',
  'error.auth.sessionExpired':
    'Your session expired. Please sign in again to continue.',
  'error.auth.captchaFailed':
    "We couldn't verify that you're human. Please try again.",
  'error.auth.reauthNeeded':
    'For security, sign in again before making this change.',
  'error.auth.rateLimit':
    'Too many attempts in a row. Wait a moment before trying again.',
  'error.auth.rateLimitSeconds':
    'For security reasons, wait {seconds} seconds before trying again.',
  'error.auth.notCashier':
    'This account is not registered as a cashier. Please use the app that matches your account.',
  'error.auth.noPermission': 'This account does not have cashier permissions.',
  'error.auth.disabledAccount':
    'This account is deactivated. Contact your administrator.',
  'error.auth.signUpFailed':
    "We couldn't create your account. Please try again in a few minutes.",
  'error.auth.roleLookupFailed':
    "We couldn't load the cashier role. Please try again.",
  'error.auth.organizationNotFound': 'That organization does not exist.',
  'error.auth.profileFailed':
    "We couldn't create your cashier profile. Please try again.",

  'error.db.duplicate': 'That value is already registered. Check it and try again.',
  'error.db.inUse':
    "We can't complete this because the record is still in use.",
  'error.db.missingField': 'Some required fields are missing. Check the form.',
  'error.db.invalidValue': "Some of the data isn't valid. Check it and try again.",
  'error.db.forbidden': "You don't have permission to do this.",
  'error.db.notFound': "We couldn't find what you were looking for.",

  'error.rpc.outOfStock': 'This reward is out of stock.',
  'error.rpc.insufficientPoints': "The customer doesn't have enough points.",
  'error.rpc.notPending': 'This redemption is no longer pending.',
  'error.rpc.redemptionNotFound': "We couldn't find that redemption.",
  'error.rpc.membershipInactive':
    'This customer is no longer a club member. Add them again before awarding points.',

  // --- Sign in -------------------------------------------------------------
  'signIn.title': 'PuntosClub Caja',
  'signIn.subtitle': 'Award points, build loyalty',
  'signIn.email': 'Email',
  'signIn.emailPlaceholder': 'you@email.com',
  'signIn.password': 'Password',
  'signIn.passwordPlaceholder': 'Your password',
  'signIn.showPassword': 'Show password',
  'signIn.hidePassword': 'Hide password',
  'signIn.remember': 'Remember me',
  'signIn.forgot': 'Forgot your password?',
  'signIn.submit': 'Sign In',
  'signIn.divider': 'or continue with',
  'signIn.biometric': 'Use fingerprint',
  'signIn.biometricPill': 'Fast and secure',
  'signIn.helpTitle': 'Need help?',
  'signIn.helpSubtitle': 'Write to us at soporte@puntosclub.com.ar',
  'signIn.helpSubject': 'Help signing in to PuntosClub Caja',
  'signIn.missingFields': 'Please fill in every field.',
  'signIn.comingSoon': 'Coming soon',

  'biometric.title': 'Fingerprint',
  'biometric.offer': 'Do you want to use your fingerprint to sign in next time?',
  'biometric.later': 'Not now',
  'biometric.enable': 'Turn on',
  'biometric.notReady':
    'Sign in once with your email and password to enable fingerprint sign-in.',
  'biometric.prompt': 'Sign in with your fingerprint',

  'forgot.title': 'Reset password',
  'forgot.needEmail': 'Type your email above and tap the link again.',
  'forgot.sent': 'We sent you an email with a link to create a new password.',

  // --- Home ----------------------------------------------------------------
  'home.title': 'PuntosClub Caja',
  'home.greeting': 'Hi, {name}! 👋',
  'home.greetingSub': 'Ready to award points today.',
  'home.organizationLabel': 'ORGANIZATION',
  'home.orgQrLabel': "View the organization's QR code",
  'home.notifications': 'Notifications',
  'home.notificationsWithCount': 'Notifications, {count}',
  'home.noPendingDeliveries': 'You have no redemptions waiting for delivery.',
  'home.scanClient': 'Scan Customer',
  'home.scanClientSub':
    "Scan the customer's QR code to record sales or redemptions",
  'home.pendingDeliveries': 'Pending deliveries',
  'home.pendingWaiting': '{count} waiting for delivery',
  'home.searchClient': 'Find Customer',
  'home.searchClientSub': "Search by email or ID if the customer's QR isn't handy",
  'home.rulesTitle': 'Active rules and campaigns',
  'home.rulesEmpty': 'No rules configured yet',
  'home.rulesSummary': '{campaigns} and {general} currently in effect',
  'home.rulesView': 'View',
  'home.moreOptions': 'More options',
  'home.redemptionHistory': 'Redemption history',
  'home.redemptionHistorySub': 'Review the most recent redemptions',
  'home.helpTitle': 'Need help?',
  'home.helpSub': "Email your organization's manager",
  'home.edit': 'Edit',
  'home.qrModalTitle': '{name} QR code',
  'home.qrModalSubtitle': 'Customers can scan this code to join',
  'home.qrModalHint': 'Tap outside the box to close',

  'help.title': 'Help',
  'help.noOwnerEmail':
    "We couldn't find the email of your organization's manager.",
  'help.mailFailed': "We couldn't open your mail app. Write to {email}",
  'help.subject': 'Question from {name} - {organization}',

  'signOut.action': 'Sign out',
  'signOut.confirmTitle': 'Sign out',
  'signOut.confirmBody': 'Are you sure you want to sign out?',

  'plural.pendingRedemptionOne': '1 pending redemption',
  'plural.pendingRedemptionMany': '{count} pending redemptions',
  'plural.redemptionOne': '1 redemption',
  'plural.redemptionMany': '{count} redemptions',
  'plural.campaignOne': '1 campaign',
  'plural.campaignMany': '{count} campaigns',
  'plural.generalRuleOne': '1 general rule',
  'plural.generalRuleMany': '{count} general rules',

  // --- Profile -------------------------------------------------------------
  'profile.header': 'My Profile',
  'profile.title': 'My Profile',
  'profile.subtitle': 'Update your personal information.',
  'profile.firstName': 'First name',
  'profile.lastName': 'Last name',
  'profile.email': 'Email',
  'profile.emailHint':
    'To change your email, contact your manager or an administrator.',
  'profile.organization': 'Organization',
  'profile.status': 'Status',
  'profile.save': 'Save changes',
  'profile.savedTitle': 'Done',
  'profile.savedBody': 'Your profile was updated successfully.',
  'profile.myProfile': 'My profile',
  'profile.language': 'Language',
  'profile.languageEs': 'Español',
  'profile.languageEn': 'English',

  // --- Scanner -------------------------------------------------------------
  'scanner.permissionTitle': 'Camera permission',
  'scanner.permissionBody': 'We need camera access to scan QR codes.',
  'scanner.permissionAction': 'Grant permission',
  'scanner.instruction': "Scan the customer's QR code",
  'scanner.invalidQr': 'Invalid QR code.',
  'scanner.invalidId': "That QR code doesn't carry a valid customer ID.",
  'scanner.userNotFound':
    "We couldn't find that customer. Ask them to open their QR code again.",
  'scanner.readFailed': "We couldn't read that QR code.",

  // --- Find customer -------------------------------------------------------
  'search.header': 'Find Customer',
  'search.title': 'Find Customer',
  'search.subtitle':
    'Find the customer by scanning their QR code{br}or entering their email or ID.',
  'search.modeEmail': 'Email',
  'search.modeDni': 'ID',
  'search.emailPlaceholder': 'customer@example.com',
  'search.dniPlaceholder': 'ID number',
  'search.submitLabel': 'Start search',
  'search.scanTitle': 'Find Customer',
  'search.scanSubtitle': "Scan the customer's QR code",
  'search.hintTitle': "Where's the QR code?",
  'search.hintSubtitle':
    'Customers find their QR code in the PuntosClub app, on their profile.',
  'search.requiredTitle': 'Field required',
  'search.requiredEmail': 'Please enter an email to search.',
  'search.requiredDni': 'Please enter an ID number to search.',
  'search.notFoundTitle': 'Not found',
  'search.notFoundEmail': 'No customer is registered with that email.',
  'search.notFoundDni': 'No customer is registered with that ID number.',

  // --- Scanned customer ----------------------------------------------------
  'client.foundTitle': 'Customer Found',
  'client.scannedTitle': 'Customer Scanned',
  'client.member': 'ACTIVE MEMBER',
  'client.notMember': 'NOT A MEMBER',
  'client.availablePoints': 'Available points',
  'client.noRulesWarning':
    "Your organization doesn't have any points rules yet. Ask an administrator to create one before recording sales.",
  'client.newSale': 'New Sale',
  'client.inviteMessage':
    "This customer doesn't belong to your organization. You can invite them so they start earning points.",
  'client.inviteAction': 'Invite Customer',
  'client.inviteMissingData': 'Some details are missing to invite this customer.',
  'client.inviteFailed': "We couldn't add the customer. Please try again.",
  'client.invitedTitle': 'Customer added',
  'client.invitedBody': '{name} is now a member of your organization.',
  'client.scanAnotherMember': 'Scan another customer',
  'client.scanAnother': 'Scan another',
  'client.verifiedTitle': 'Customer verified successfully',
  'client.verifiedBody': 'You can record sales.',
  'client.goHome': 'Back to home',

  // --- New sale ------------------------------------------------------------
  'sale.header': 'New Sale',
  'sale.currentPoints': '{points} pts currently',
  'sale.amountLabel': 'Purchase amount',
  'sale.amountHint': 'Enter the total purchase amount',
  'sale.previewLabel': 'Points to earn',
  'sale.submit': 'Record Sale',
  'sale.invalidAmount': 'Please enter a valid amount.',
  'sale.missingData': 'Some details are missing. Scan the customer again.',
  'sale.registerFailed': "We couldn't record the sale. Please try again.",
  'sale.confirmTitle': 'Confirm the award',
  'sale.confirmLead': "You're about to award",
  'sale.confirmUnitOne': 'point to {name}',
  'sale.confirmUnitMany': 'points to {name}',
  'sale.confirmAmountLabel': 'Purchase amount',
  'sale.confirmHint':
    "If that number isn't what you expected, cancel and check the amount before recording.",
  'sale.confirmAction': 'Confirm and record',
  'sale.confirmCancel': 'Cancel and fix',
  'sale.successHeader': 'Sale Recorded',
  'sale.successTitle': 'Sale successful!',
  'sale.pointsEarned': 'Points earned',
  'sale.detailAmount': 'Purchase amount',
  'sale.scanAnother': 'Scan Another',
  'sale.finish': 'Finish',
  'sale.note': 'Sale from cashier app',
  'sale.rateSuffix': '{rate} of the purchase',

  // --- Redemptions and deliveries -----------------------------------------
  'redemptions.header': 'Redemptions and deliveries',
  'redemptions.tabPending': 'Pending',
  'redemptions.tabDelivered': 'Delivered',
  'redemptions.tabCancelled': 'Cancelled',
  'redemptions.banner':
    "These redemptions are waiting for delivery.\nHand over the rewards and record the delivery to update the customer's points.",
  'redemptions.dismissBanner': 'Dismiss notice',
  'redemptions.pendingTitle': 'Pending deliveries',
  'redemptions.pendingUnit': 'pending',
  'redemptions.pendingEmptyTitle': 'No pending redemptions',
  'redemptions.pendingEmptyBody':
    'When a customer requests a redemption it shows up here.',
  'redemptions.deliveredTitle': 'Delivered redemptions',
  'redemptions.deliveredUnit': 'delivered',
  'redemptions.deliveredEmptyTitle': 'No deliveries yet',
  'redemptions.deliveredEmptyBody':
    'Every redemption you hand over gets logged here.',
  'redemptions.cancelledTitle': 'Cancelled redemptions',
  'redemptions.cancelledUnit': 'cancelled',
  'redemptions.cancelledEmptyTitle': 'No cancellations yet',
  'redemptions.cancelledEmptyBody':
    'Cancelled redemptions stay here as a record.',
  'redemptions.product': 'Reward',
  'redemptions.requestedAt': 'Requested: {date}',
  'redemptions.deliveredAt': 'Delivered: {date}',
  'redemptions.cancelledAt': 'Cancelled: {date}',
  'redemptions.deliver': 'Deliver',
  'redemptions.cancel': 'Cancel',
  'redemptions.deliverFailed': "Couldn't deliver",
  'redemptions.cancelFailed': "Couldn't cancel",
  'redemptions.cancelConfirmTitle': 'Cancel redemption',
  'redemptions.cancelConfirmBody':
    'Confirm the cancellation? The points go back to the customer and the stock is restored.',
  'redemptions.cancelConfirmAction': 'Yes, cancel',
  'redemptions.cancelReason': 'Cancelled by cashier',

  // --- Rules and campaigns -------------------------------------------------
  'rules.header': 'Active rules and campaigns',
  'rules.bannerTitle':
    'These rules decide how points are awarded and how they can be redeemed.',
  'rules.bannerSubtitle': 'You can only view them. They cannot be edited.',
  'rules.motherSection': 'Base rule',
  'rules.alwaysActive': 'Always active',
  'rules.validity': 'Valid',
  'rules.appliesTo': 'Applies to',
  'rules.allTransactions': 'every transaction',
  'rules.start': 'Start',
  'rules.end': 'End',
  'rules.whenApplies': 'When it applies',
  'rules.activeCampaigns': 'Active campaigns',
  'rules.campaigns': 'Campaigns',
  'rules.otherRules': 'Other rules',
  'rules.emptyTitle': 'No active rules yet',
  'rules.emptyBody':
    "Rules and campaigns are set up from the organization's admin panel.",
  'rules.helpTitle': 'Any questions?',
  'rules.helpBody':
    "Ask the program administrator or your organization's manager.",
  'rules.statusActive': 'Campaign',
  'rules.statusScheduled': 'Scheduled',
  'rules.statusEnded': 'Ended',

  'rule.unknownValue': 'Points',
  'rule.unknownUnit': 'as configured',
  'rule.perSale': 'per sale',
  'rule.perDollar': 'per $1',
  'rule.percentOfAmount': 'of the amount in points',
  'rule.perItem': 'per item',
  'rule.tieredUnit': 'by purchase tier',
  'rule.tieredBadge': 'Tier',
  'rule.pointsValueOne': '{points} point',
  'rule.pointsValueMany': '{points} points',
  'rule.periodBetween': 'From {from} to {to}',
  'rule.periodFrom': 'From {from}',
  'rule.periodUntil': 'Until {to}',
  'rule.periodAlways': 'Always',
  'rule.timeRange': '{from} to {to}',

  'day.0': 'Sun',
  'day.1': 'Mon',
  'day.2': 'Tue',
  'day.3': 'Wed',
  'day.4': 'Thu',
  'day.5': 'Fri',
  'day.6': 'Sat',
};
