import {test,expect,describe} from '@jest/globals';
import { AppError, lateSQL, delaySQL, ensure, assertUUID, string, number, oneOf, closed, safeText } from '../src/domain/common.js';
import { validateTransition, validateIncidentCreate } from '../src/domain/operations.js';

describe('RN-ATR-01 / RN-ATR-02: regra determinística',()=>{
 test('SQL exclui pedidos entregues/cancelados e inclui tolerância',()=>{
   expect(lateSQL()).toMatch(/NOT IN \('DELIVERED','CANCELED'\)/);
   expect(lateSQL()).toMatch(/interval '5 minutes'/);
   expect(delaySQL()).toMatch(/greatest\(0,floor/);
 });
});
describe('RF-INC-03: validação de domínio',()=>{
 test.each([['OPEN','IN_PROGRESS'],['OPEN','RESOLVED'],['IN_PROGRESS','OPEN'],['IN_PROGRESS','RESOLVED'],['RESOLVED','IN_PROGRESS']])('transição permitida %s → %s',(a,b)=>expect(()=>validateTransition(a,b,'Justificativa de pelo menos 10 caracteres')).not.toThrow());
 test('RESOLVED → OPEN é proibida',()=>expect(()=>validateTransition('RESOLVED','OPEN','Justificativa suficiente')).toThrow());
 test('reabrir exige justificativa',()=>expect(()=>validateTransition('RESOLVED','IN_PROGRESS','curto')).toThrow());
 test('incidente exige descrição 15+',()=>expect(()=>validateIncidentCreate({order_id:'d5ca9e0e-8dc5-40f3-a0bc-46ed4d283967',category:'DELIVERY_DELAY',priority:'HIGH',description:'curto'})).toThrow());
 test('enum inválido',()=>expect(()=>oneOf('SUPER_HIGH',['LOW','HIGH'])).toThrow());
 test('ignora chaves extras? não',()=>expect(()=>closed({status:'OPEN',role:'ADMIN'},['status'])).toThrow());
 test('UUID inválido',()=>expect(()=>assertUUID('PED-1052')).toThrow());
 test('string longa',()=>expect(()=>string('a'.repeat(1001),1,1000)).toThrow());
});
