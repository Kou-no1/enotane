import { expect, test, type Page } from '@playwright/test';

async function pausedClock(page:Page,url:string) {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.clock.install({time:new Date('2026-10-09T12:00:00Z')});
  await page.goto(url);
  await expect(page.locator('.lesson-player[data-player-ready=true]')).toHaveCount(url.includes('compare')?2:1);
  // Pausing an idle clock after loading leaves both transports at their starts.
  await page.clock.pauseAt(new Date('2026-10-09T14:00:00Z'));
}

test('shared comparison pauses both at unequal teacher step boundaries and resumes both',async({page})=>{
  await pausedClock(page,'/?view=compare&mode=teacher');
  const players=page.locator('.lesson-player'),left=players.nth(0),right=players.nth(1);
  await page.getByRole('button',{name:'両方を再生',exact:true}).click();
  await page.clock.runFor(80);await page.clock.fastForward(5500);
  await expect(left).toHaveAttribute('data-player-status','step-ended');await expect(right).toHaveAttribute('data-player-status','playing');
  await page.getByRole('button',{name:'両方を一時停止',exact:true}).click();
  // Completed steps retain their completed state instead of jumping to the next.
  await expect(left).toHaveAttribute('data-player-status','step-ended');await expect(left).toHaveAttribute('data-step-index','0');
  await expect(right).toHaveAttribute('data-player-status','paused');
  await page.getByRole('button',{name:'両方を再生',exact:true}).click();await page.clock.runFor(80);
  await expect(left).toHaveAttribute('data-player-status','playing');await expect(left).toHaveAttribute('data-step-index','1');await expect(right).toHaveAttribute('data-player-status','playing');await expect(right).toHaveAttribute('data-step-index','0');
});

test('one loading comparison panel disables every shared transport',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/data/anim/C-09.json',async route=>{await gate;await route.continue();});
  await page.goto('/?view=compare');
  await expect(page.locator('.lesson-player').first()).toHaveAttribute('data-player-ready','true');
  await expect(page.locator('.lesson-player').nth(1)).toHaveAttribute('data-player-ready','false');
  for(const button of await page.locator('.shared-transport button').all())await expect(button).toBeDisabled();
  await expect(page.locator('.lesson-player').first()).toHaveAttribute('data-player-status','ready');
  release();await expect(page.getByRole('button',{name:'両方を再生',exact:true})).toBeEnabled();await expect(page.locator('.lesson-player[data-player-status=playing]')).toHaveCount(0);
});

test('one failed comparison fetch disables shared commands and preserves the other start',async({page})=>{
  await page.route('**/data/anim/C-09.json',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.goto('/?view=compare');await expect(page.locator('.lesson-player').first()).toHaveAttribute('data-player-ready','true');await expect(page.getByRole('alert')).toContainText('アニメーションを読み込めませんでした');
  for(const button of await page.locator('.shared-transport button').all())await expect(button).toBeDisabled();await expect(page.locator('.lesson-player').first()).toHaveAttribute('data-player-status','ready');
});

test('keyboard commands during a pending restore cannot replace the requested replay',async({page})=>{
  await pausedClock(page,'/?lesson=P-02');const player=page.locator('.lesson-player');
  await page.getByRole('button',{name:'もう一回',exact:true}).click();await expect(player).toHaveAttribute('data-player-ready','false');
  await player.focus();await player.press(' ');await player.press('ArrowRight');
  await page.clock.runFor(100);await expect(player).toHaveAttribute('data-player-ready','true');await expect(player).toHaveAttribute('data-step-index','0');await expect(player).toHaveAttribute('data-player-status','playing');
});
