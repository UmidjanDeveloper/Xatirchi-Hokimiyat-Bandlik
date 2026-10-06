import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Maskot, MASKOT_HOLATLARI } from '../src/components/agent/maskot';
import { suhbatIfodasi } from '../src/lib/agent/robot-ifoda';
import { nutqUlanishi } from '../src/lib/agent/nutq';
import { robotVazifaHolati } from '../src/lib/agent/robot-kayfiyati';

Object.assign(globalThis, { React });
let soni = 0;
function sinov(nom: string, tekshir: () => void) {
  tekshir(); soni++; console.log('OK', nom);
}
sinov('All activity states render a vector robot with an accessible name', () => {
  for (const holat of MASKOT_HOLATLARI) {
    const html = renderToStaticMarkup(React.createElement(Maskot, { holat, sarlavha: 'Hamroh' }));
    assert.match(html, /<svg/); assert.match(html, /aria-label="Hamroh"/);
    assert.match(html, new RegExp(`maskot-${holat}`)); assert.doesNotMatch(html, /<img/);
  }
});
sinov('Mouth opens with audio and invalid levels cannot break the face', () => {
  const render = (daraja: number) => renderToStaticMarkup(React.createElement(Maskot, { holat: 'gapirmoqda', daraja }));
  assert.match(render(0), /ry="1"/);
  assert.match(render(1), /ry="9"/);
  assert.match(render(Infinity), /ry="1"/);
  assert.match(render(-4), /ry="1"/);
  assert.match(render(10), /ry="9"/);
});
sinov('Happy and serious faces remain distinct even without animation', () => {
  const happy = renderToStaticMarkup(React.createElement(Maskot, { kayfiyat: 'xursand' }));
  const serious = renderToStaticMarkup(React.createElement(Maskot, { kayfiyat: 'jiddiy' }));
  assert.notEqual(happy, serious); assert.match(happy, /M50 67Q60 78 70 67/); assert.match(serious, /M51 72Q60 65 69 72/);
});
sinov('Overdue tasks cause a serious mood; ordinary pending tasks do not', () => {
  assert.equal(robotVazifaHolati([{ kalit: 'kechikkan', soni: 2, ogohlik: 'shoshilinch' }]).kayfiyat, 'jiddiy');
  assert.equal(robotVazifaHolati([{ kalit: 'bugun', soni: 2, ogohlik: 'diqqat' }]).kayfiyat, 'vazmin');
});
sinov('Missing measurements never fabricate overdue tasks or success', () => {
  assert.deepEqual(robotVazifaHolati([{ kalit: 'kechikkan', soni: 20, ogohlik: 'shoshilinch', yetishmayotgan: 'Baza mavjud emas' }]), { kayfiyat: 'vazmin', kechikkan: 0, shoshilinch: 0 });
  assert.equal(robotVazifaHolati([]).kayfiyat, 'vazmin');
});
sinov('Other urgent issues show concern, not invented overdue task counts', () => {
  assert.deepEqual(robotVazifaHolati([{ kalit: 'uzilish', soni: 3, ogohlik: 'shoshilinch' }]), { kayfiyat: 'xavotir', kechikkan: 0, shoshilinch: 1 });
});
sinov('Uzbek expression commands work in both alphabets without manufacturing task outcomes', () => {
  assert.equal(suhbatIfodasi("jahlingni ko'rsat")?.kayfiyat, 'jiddiy');
  assert.equal(suhbatIfodasi('Жаҳлингни кўрсат')?.kayfiyat, 'jiddiy');
  assert.equal(suhbatIfodasi('tabassum qil')?.kayfiyat, 'xursand');
  assert.equal(suhbatIfodasi('Катта раҳмат')?.kayfiyat, 'xursand');
  assert.equal(suhbatIfodasi('vazifa bajarildi'), null);
  assert.equal(suhbatIfodasi('kechikkan vazifa bor'), null);
});
sinov('Voice diagnostics distinguish a missing key from disabled output', () => {
  assert.equal(nutqUlanishi({ NODE_ENV: 'test' }), 'kalit_yoq');
  assert.equal(nutqUlanishi({ NODE_ENV: 'test', OPENAI_API_KEY: 'test' }), 'ochirilgan');
  assert.equal(nutqUlanishi({ NODE_ENV: 'test', OPENAI_API_KEY: 'test', AGENT_TTS: '1' }), 'tayyor');
});
console.log(`${soni}/${soni} o'tdi`);
