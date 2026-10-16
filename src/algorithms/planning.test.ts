import assert from 'node:assert/strict';
import {recommend,optimise,solar,scenarioMetrics,type Candidate} from './planning.ts';
import {zones} from '../data/zones.ts';
const candidate=(id:string,cost:number,score:number,group?:string):Candidate=>({id,cost,score,group,zone:'Z001',name:id,reason:'test',inputs:'test',verification:'test',benefit:'test',eligible:true,green:0,generation:0});
// Greedy score and score/cost both lose to the exact combination here.
const fixture=[candidate('a',6,11),candidate('b',5,9),candidate('c',5,9)];
assert.deepEqual(optimise(fixture,10).selected.map(x=>x.id),['b','c']);
assert.equal(optimise(fixture,0).selected.length,0);
assert.deepEqual(optimise(fixture,10,['b']).selected.map(x=>x.id),['a']);
const conflict=[candidate('roof-solar',5,10,'roof'),candidate('roof-cool',5,9,'roof'),candidate('trees',5,8)];
assert.equal(optimise(conflict,15).score,18);
assert.equal(optimise([{...fixture[0],eligible:false}],100).selected.length,0);
assert.equal(optimise([candidate('expensive',10,10),candidate('cheap',5,10)],10).cost,5);
assert.throws(()=>optimise(fixture,-1));
const recommendations=recommend(36.5);
for(const budget of [0,50000,100000,250000]){const p=optimise(recommendations,budget);assert.ok(p.cost<=budget);assert.equal(p.remaining,budget-p.cost);const groups=p.selected.map(c=>c.group).filter(Boolean);assert.equal(groups.length,new Set(groups).size);}
assert.ok(optimise(recommendations,100000).score>=optimise(recommendations,50000).score);
assert.ok(recommendations.some(c=>c.zone==='Z001'&&c.name==='Shade trees'));
assert.ok(!recommend(45).some(c=>c.name==='Shade trees'));
assert.ok(recommend(45).some(c=>c.name==='Rooftop solar'));
assert.deepEqual(solar({area:200,density:.16,yield:1300,factor:.85,cost:3200}),{capacity:32,generation:35360,cost:102400});
assert.throws(()=>solar({area:-1,density:.16,yield:1300,factor:.85,cost:3200}));
assert.throws(()=>solar({area:200,density:.16,yield:1300,factor:1.1,cost:3200}));
assert.equal(zones.length,8);assert.equal(new Set(zones.map(z=>z.zone_id)).size,8);
const baseline={name:'A',area:100,land:[50,20,10,15,5],roof:1000,budget:1000000,options:[false,false,false,false,false,false]};
assert.equal(scenarioMetrics(baseline).green,10);
assert.equal(scenarioMetrics({...baseline,options:[false,true,false,false,false,false]}).generation,176800);
console.log('Passed: exact optimisation, budget bounds, exclusions, eligibility, exclusivity, tie-breaking, threshold rules, solar units and scenario calculations.');
