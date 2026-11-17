import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(process.argv[2] || path.join(root, '../hsr'));
const sourceDist = path.join(sourceRoot, 'dist');
// Read the data-only export without executing code from the source project.
const catalog = JSON.parse(fs.readFileSync(path.join(sourceDist, 'catalog.js'), 'utf8')
  .replace(/^export const catalog =\s*/, '').replace(/;\s*$/, ''));
const dataFile = path.join(root, 'data.json');
const original = fs.readFileSync(dataFile, 'utf8');
const data = JSON.parse(original);
const normalize = name => name.replaceAll('•', '·');
const unique = values => [...new Set(values)];
const aliases = { '三月七·巡猎': '三月七', '开拓者·欢愉': '开拓者' };
const existing = new Map(data.namelist.map(role => [role.name, role]));
const lookup = name => existing.get(normalize(name)) || existing.get(aliases[normalize(name)]);
const formIds = ['1213', '1414'];
const canonicalId = id => formIds.includes(id) ? 'danheng' : id;
const groups = new Map();
for (const character of catalog.characters) {
  const id = canonicalId(character.id);
  if (!groups.has(id)) groups.set(id, []);
  groups.get(id).push(character);
}
if (groups.size !== 60 || catalog.traits.length !== 34 ||
    groups.get('danheng')?.length !== 2) {
  throw new Error('预期 60 个角色、34 个羁绊和丹恒的两种形态；源数据有变，请先核对。');
}

const imageDir = path.join(root, 'public/assets/images');
const copies = new Map();
const imagePath = name => path.join(imageDir, `${name}.png`);
const findImage = name => ['png', 'webp', 'jpg', 'jpeg', 'svg', 'gif']
  .map(ext => path.join(imageDir, `${name}.${ext}`)).find(file => fs.existsSync(file));
function queueImage(source, destination) {
  if (!fs.existsSync(source)) throw new Error(`缺少图片：${source}`);
  if (!fs.existsSync(destination) || !fs.readFileSync(source).equals(fs.readFileSync(destination))) {
    copies.set(destination, source);
  }
}
const nameMap = new Map();
const ranks = new Map(data.namelist.map((role, index) => [role.name, index]));
const previousPresentation = form => {
  const imported = data.namelist.find(role => role.s2?.sourceIds?.includes(form.id));
  const archived = imported?.s2.forms?.find(item => item.id === form.id);
  if (archived) return archived.previousPresentation;
  const previous = lookup(form.name);
  if (!previous) return null;
  const { s2, ...presentation } = previous;
  return presentation;
};
const localImageUrl = file => `/assets/images/${path.basename(file)}`;
const roles = [...groups].map(([id, forms], index) => {
  const primary = forms.find(form => form.id === '1213') || forms[0];
  const name = id === 'danheng' ? '丹恒' : normalize(primary.name);
  const old = existing.get(name) || lookup(primary.name);
  const traits = unique(forms.flatMap(form => form.traits));
  const points = old?.points ?? primary.points ?? primary.referencePoints ?? [];
  const role = {
    colorMode: 'preset', colorIndex: index % 5,
    duration: data.CONFIG.DEFAULT_DURATION,
    ...old,
    name,
    points,
    desc: traits.join(' '),
    s2: {
      ...primary, id, name,
      sourceIds: forms.map(form => form.id),
      traits,
      costs: unique(forms.flatMap(form => form.costs)),
      position: forms.length > 1 ? '前后台' : primary.position,
      roles: unique(forms.flatMap(form => form.roles)),
      scoreSource: old?.s2?.scoreSource || (old ? 'existing' : primary.points ? 's2' : primary.referencePoints ? 'historical-reference' : 'pending'),
      forms: forms.map(form => {
        const formName = normalize(form.name);
        const prior = lookup(form.name);
        let portrait = findImage(prior?.photoName || prior?.name || formName);
        if (!portrait) {
          portrait = imagePath(formName);
          queueImage(path.join(sourceDist, form.portrait || form.icon), portrait);
        }
        return {
          ...form, icon: localImageUrl(portrait), portrait: localImageUrl(portrait),
          previousPresentation: previousPresentation(form),
        };
      }),
    },
  };
  // Keep one timeline entry. Both source forms and their original scores remain in s2.forms.
  if (id === 'danheng') role.photoName = old?.photoName || normalize(primary.name);
  const oldImage = findImage(old?.photoName || old?.name || normalize(primary.name));
  if (!findImage(name)) {
    queueImage(oldImage || path.join(sourceDist, primary.portrait || primary.icon), imagePath(name));
  }
  role.s2.icon = role.s2.portrait = localImageUrl(findImage(name) || imagePath(name));
  for (const form of forms) {
    nameMap.set(normalize(form.name), name);
    const prior = lookup(form.name);
    if (prior) nameMap.set(prior.name, name);
  }
  // Renamed characters retain their existing framing and custom artwork.
  if (old && data.IMAGE_META?.[old.name] && !data.IMAGE_META[name]) {
    data.IMAGE_META[name] = structuredClone(data.IMAGE_META[old.name]);
  }
  return { role, rank: ranks.get(old?.name) ?? data.namelist.length + index };
}).sort((a, b) => a.rank - b.rank).map(entry => entry.role);

const traits = catalog.traits.map(trait => {
  if (trait.icon) queueImage(path.join(sourceDist, trait.icon), imagePath(`faction_${trait.name}`));
  return {
    ...trait,
    icon: trait.icon ? `/assets/images/faction_${trait.name}.png` : null,
    memberIds: roles.filter(role => role.s2.traits.includes(trait.name)).map(role => role.s2.id),
  };
});
const traitNames = new Set(traits.map(trait => trait.name));
for (const role of roles) {
  for (const trait of role.s2.traits) {
    if (!traitNames.has(trait)) throw new Error(`未知羁绊：${role.name} / ${trait}`);
  }
}
data.namelist = roles;
const names = new Set(roles.map(role => role.name));
data.mvplist = unique((data.mvplist || []).map(name => nameMap.get(name) || name)).filter(name => names.has(name));
data.expertlist = roles.filter(role => role.s2.expert).map(role => role.name);
const { characters, traits: sourceTraits, ...metadata } = catalog;
data.S2_CATALOG = {
  ...metadata,
  sourceProject: 'hsr/dist/catalog.js',
  sourceCharacterCount: characters.length,
  characterCount: roles.length,
  traits,
};

// Keep the user's complete pre-import data and any replaced artwork for rollback.
const backup = path.join(root, 'workspace/hsr-s2-import', new Date().toISOString().replaceAll(':', '-'));
fs.mkdirSync(backup, { recursive: true });
fs.writeFileSync(path.join(backup, 'data.json'), original);
for (const [destination, source] of copies) {
  if (fs.existsSync(destination)) {
    fs.mkdirSync(path.join(backup, 'images'), { recursive: true });
    fs.copyFileSync(destination, path.join(backup, 'images', path.basename(destination)));
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({
  characters: roles.length, traits: traits.length,
  copiedImages: copies.size,
  pendingScores: roles.filter(role => role.s2.scoreSource === 'pending').map(role => role.name),
  backup,
}, null, 2));
