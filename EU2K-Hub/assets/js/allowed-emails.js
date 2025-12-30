// Allowed Emails Whitelist
// Egyszerű whitelist ellenőrzés az onboardinghoz

// Itt add meg az engedélyezett email címeket
const ALLOWED_EMAILS = [
  'turoczi.adam@europa2000.hu',
  'gombar.csenge@europa2000.hu',
  'sellyei.sara.e@europa2000.hu',
  'kulik.timea@europa2000.hu',
  'cai.haojun@europa2000.hu',
  'wendland.botond@europa2000.hu',
  'komoroczy.ivan.k@europa2000.hu',
  'pelikan.levente.a@europa2000.hu',
  'borkuti.rebeka@europa2000.hu',
  'ivanyi.zsigmond@europa2000.hu',
  'magda.viki@europa2000.hu',
  'jonas.timon.l@europa2000.hu',
  'vecsei.daniel.m@europa2000.hu',
  'tan.emily@europa2000.hu',
  'krupp.noemi@europa2000.hu',
  'boros.szofia.l@europa2000.hu',
  'wang.suncanyang@europa2000.hu',
  'besenyei.igor.p@europa2000.hu',
  'laszlo.fruzsina@europa2000.hu',
  'viragh.reka@europa2000.hu',
  'orto.bendeguz@europa2000.hu',
  'csordas.panna.s@europa2000.hu',
  'halevy.r.maya@europa2000.hu',
  'skripeczky.flora.v@europa2000.hu',
  'sztana.fruzsina.zs@europa2000.hu',
  'torma.o.emma@europa2000.hu',
  'benko.marton.i@europa2000.hu',
  'hosszu.dora.l@europa2000.hu',
  'szaniszlo.keve@europa2000.hu',
  'apathy.bence@europa2000.hu',
  'becseics.zora@europa2000.hu',
  'kovacs.lilla@europa2000.hu',
  'szoke.milan@europa2000.hu',
  'boros.petra@europa2000.hu',
  'gerhardt.petra@europa2000.hu',
  'krupp.marton@europa2000.hu',
  'zsoldos.rebeka@europa2000.hu',
  'kis-kallo.dora@europa2000.hu',
  'marafko.mira.f@europa2000.hu',
  'juhasz.miklos@europa2000.hu',
  'suranyi.vera.j@europa2000.hu',
  'kuntner.panna@europa2000.hu',
  'morocz.marcell.i@europa2000.hu',
  'turiak.levente@europa2000.hu',
  'horvath.flora@europa2000.hu',
  'morvai.magdalena@europa2000.hu',
  'endredi.baratta.k@europa2000.hu',
  'vereb.adam.l@europa2000.hu',
  'szuhov.alexander@europa2000.hu',
  'nagy.szilvia@europa2000.hu',
  'toth.eliza@europa2000.hu',
  'nagy.gergely.l@europa2000.hu',
  'kakuk.zeno@europa2000.hu',
  'naguib.joyes@europa2000.hu',
  'fekete.reka@europa2000.hu',
  'banki.abigel@europa2000.hu',
  'hamar.csaba@europa2000.hu',
  'perehazy.patrik@europa2000.hu',
  'pittia.liliana.z@europa2000.hu',
  'batka.miklos.d@europa2000.hu',
  'papp.andras@europa2000.hu',
  'vincze.attila@europa2000.hu'
];

/**
 * Ellenőrzi, hogy az email szerepel-e az engedélyezett listában
 * Visszatérési érték: Promise<boolean>
 */
export async function isEmailAllowed(email) {
  try {
    if (!email || typeof email !== 'string') return false;
    const normalized = email.trim().toLowerCase();
    return ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(normalized);
  } catch (e) {
    console.error('allowed-emails.js hiba:', e);
    return false;
  }
}

export default { isEmailAllowed };