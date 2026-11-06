type MailTemplate = { subject: string; html: string; text: string };

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const layout = (title: string, content: string, preview: string): MailTemplate => ({
  subject: title,
  text: preview,
  html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#f3f2ec;color:#18221b;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f2ec;padding:28px 12px">
      <tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #dfe4dd">
        <tr><td style="padding:28px 34px;background:#07120c;color:#fff"><div style="font-size:26px;font-weight:800;letter-spacing:-1px">THE CHOICE</div><div style="margin-top:5px;color:#64ad6c;font-size:11px;letter-spacing:2px;text-transform:uppercase">Fusion Food</div></td></tr>
        <tr><td style="padding:34px"><h1 style="margin:0 0 22px;font-size:26px;line-height:1.1">${escapeHtml(title)}</h1>${content}</td></tr>
        <tr><td style="padding:20px 34px;background:#f7f8f5;color:#6d756f;font-size:12px;line-height:1.6">The Choice · 25 Avenue de l'Europe, 77184 Émerainville<br>01 60 17 56 68</td></tr>
      </table></td></tr>
    </table>
  </body></html>`,
});

const row = (label: string, value: unknown) =>
  `<tr><td style="padding:9px 0;color:#7a827c;font-size:12px;text-transform:uppercase">${escapeHtml(label)}</td><td style="padding:9px 0;text-align:right;font-weight:700">${escapeHtml(value)}</td></tr>`;

export const mailTemplates = {
  reservationCustomer: (data: { name: string; date: string; time: string; guests: number; managementLink: string }) =>
    layout(
      'Demande de réservation reçue',
      `<p>Bonjour ${escapeHtml(data.name)},</p><p style="line-height:1.7">Votre demande a bien été transmise à notre équipe. Elle sera confirmée après vérification de nos disponibilités.</p><table role="presentation" width="100%" style="margin:24px 0;border-top:1px solid #e4e8e3;border-bottom:1px solid #e4e8e3">${row('Date', data.date)}${row('Heure', data.time)}${row('Personnes', data.guests)}</table><p style="margin:24px 0"><a href="${escapeHtml(data.managementLink)}" style="display:inline-block;padding:13px 18px;background:#287b3a;color:#fff;text-decoration:none">Gérer ma réservation</a></p><p style="color:#68716a;font-size:13px">Cet e-mail est un accusé de réception, pas encore une confirmation définitive.</p>`,
      `Demande reçue pour ${data.guests} personne(s), le ${data.date} à ${data.time}.`,
    ),
  reservationTeam: (data: { name: string; email: string; phone: string; date: string; time: string; guests: number; message?: string }) =>
    layout('Nouvelle réservation à traiter', `<table role="presentation" width="100%">${row('Client', data.name)}${row('E-mail', data.email)}${row('Téléphone', data.phone)}${row('Date', data.date)}${row('Heure', data.time)}${row('Personnes', data.guests)}</table>${data.message ? `<p style="padding:16px;background:#f4f6f2"><strong>Message :</strong><br>${escapeHtml(data.message)}</p>` : ''}`, `Nouvelle demande de ${data.name} pour ${data.guests} personne(s).`),
  reservationStatus: (data: { name: string; date: string; time: string; guests: number; confirmed: boolean }) =>
    layout(
      data.confirmed ? 'Votre réservation est confirmée' : 'Votre réservation est annulée',
      `<p>Bonjour ${escapeHtml(data.name)},</p><p style="line-height:1.7">${data.confirmed ? 'Bonne nouvelle : notre équipe a confirmé votre table. Nous avons hâte de vous recevoir.' : 'Votre réservation a bien été annulée. Nous espérons vous accueillir une prochaine fois.'}</p><table role="presentation" width="100%" style="margin:24px 0;border-top:1px solid #e4e8e3;border-bottom:1px solid #e4e8e3">${row('Date', data.date)}${row('Heure', data.time)}${row('Personnes', data.guests)}</table>`,
      `Réservation ${data.confirmed ? 'confirmée' : 'annulée'} pour le ${data.date} à ${data.time}.`,
    ),
  reservationReminder: (data: { name: string; date: string; time: string; guests: number }) =>
    layout(
      'Votre table vous attend demain',
      `<p>Bonjour ${escapeHtml(data.name)},</p><p style="line-height:1.7">Petit rappel : votre réservation chez The Choice approche.</p><table role="presentation" width="100%" style="margin:24px 0;border-top:1px solid #e4e8e3;border-bottom:1px solid #e4e8e3">${row('Date', data.date)}${row('Heure', data.time)}${row('Personnes', data.guests)}</table><p style="color:#68716a;font-size:13px">En cas d’empêchement, utilisez le lien de gestion reçu lors de votre demande ou contactez directement le restaurant.</p>`,
      `Rappel de votre réservation demain à ${data.time} pour ${data.guests} personne(s).`,
    ),
  contactCustomer: (data: { name: string }) =>
    layout('Votre message a bien été transmis', `<p>Bonjour ${escapeHtml(data.name)},</p><p style="line-height:1.7">Merci d’avoir contacté The Choice. Notre équipe vous répondra dans les meilleurs délais.</p>`, 'Votre message à The Choice a bien été reçu.'),
  contactTeam: (data: { name: string; email: string; phone?: string; message: string }) =>
    layout('Nouveau message depuis le site', `<table role="presentation" width="100%">${row('Nom', data.name)}${row('E-mail', data.email)}${row('Téléphone', data.phone || 'Non renseigné')}</table><p style="padding:16px;background:#f4f6f2;line-height:1.7">${escapeHtml(data.message)}</p>`, `Nouveau message de ${data.name}.`),
  eventCustomer: (data: { name: string }) =>
    layout('Votre demande événement est reçue', `<p>Bonjour ${escapeHtml(data.name)},</p><p style="line-height:1.7">Votre projet a bien été transmis à notre équipe événementielle. Nous reviendrons vers vous pour préciser vos besoins.</p>`, 'Votre demande événement a bien été reçue.'),
  eventTeam: (data: { name: string; email: string; phone?: string; eventType: string; eventDate?: string; guests?: number; message: string }) =>
    layout('Nouvelle demande événement', `<table role="presentation" width="100%">${row('Contact', data.name)}${row('E-mail', data.email)}${row('Téléphone', data.phone || 'Non renseigné')}${row('Type', data.eventType)}${row('Date', data.eventDate || 'À définir')}${row('Personnes', data.guests || 'À définir')}</table><p style="padding:16px;background:#f4f6f2;line-height:1.7">${escapeHtml(data.message)}</p>`, `Nouvelle demande ${data.eventType} de ${data.name}.`),
  invitation: (data: { name?: string | null; link: string }) =>
    layout('Votre accès au back-office', `<p>Bonjour ${escapeHtml(data.name || '')},</p><p>Votre accès est prêt. Ce lien personnel expire dans 30 minutes.</p><p style="margin:28px 0"><a href="${escapeHtml(data.link)}" style="display:inline-block;padding:14px 20px;background:#287b3a;color:#fff;text-decoration:none;border-radius:4px">Créer mon mot de passe</a></p>`, 'Créez votre mot de passe The Choice.'),
};
