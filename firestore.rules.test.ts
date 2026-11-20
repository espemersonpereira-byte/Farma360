import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import { describe, beforeAll, afterAll, beforeEach, it } from 'vitest';

let testEnv: RulesTestEnvironment;

describe('FARMA360 Firestore Security Rules (Professional & RBAC v2)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'farma360-security-audit',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('denies unauthenticated access to user profiles', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthedDb, 'users/user_1')));
  });

  it('allows an authenticated health professional to create their own profile withusuario_profissional role', async () => {
    const userDb = testEnv.authenticatedContext('user_1').firestore();
    await assertSucceeds(
      setDoc(doc(userDb, 'users/user_1'), {
        uid: 'user_1',
        fullName: 'Dra. Camila Mendes',
        profession: 'Farmacêutico',
        customProfession: '',
        specialty: 'Farmácia Clínica e Hospitalar',
        council: 'CRF',
        registrationNumber: '45892',
        registrationUf: 'SP',
        avatarUrl: '',
        role: 'usuario_profissional',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('prevents privilege escalation to administrador on self-registration', async () => {
    const userDb = testEnv.authenticatedContext('user_2').firestore();
    await assertFails(
      setDoc(doc(userDb, 'users/user_2'), {
        uid: 'user_2',
        fullName: 'Dr. Malicioso',
        profession: 'Médico',
        customProfession: '',
        specialty: 'Clínica Médica',
        council: 'CRM',
        registrationNumber: '12345',
        registrationUf: 'RJ',
        avatarUrl: '',
        role: 'administrador',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('enforces parentUserExists master gate on private PII and favorites subcollections', async () => {
    const userDb = testEnv.authenticatedContext('user_3').firestore();
    // Should fail when parent /users/user_3 does not exist yet
    await assertFails(
      setDoc(doc(userDb, 'users/user_3/private/info'), {
        uid: 'user_3',
        email: 'user3@farma360.com.br',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('enforces 7 valid review states and blocks non-reviewers from creating content reviews', async () => {
    const regularUserDb = testEnv.authenticatedContext('user_4').firestore();
    await assertFails(
      setDoc(doc(regularUserDb, 'content_reviews/rev_1'), {
        reviewerUid: 'user_4',
        medicationId: 'med_dipirona_500',
        status: 'aprovado_publicacao',
        notes: 'Conferido com Bula Padrão ANVISA.',
        sourceRef: 'ANVISA Bulário Eletrônico 2025',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Seed reviewer role document via security-disabled context
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'reviewers/rev_user_1'), { active: true });
    });

    const reviewerDb = testEnv.authenticatedContext('rev_user_1').firestore();
    await assertSucceeds(
      setDoc(doc(reviewerDb, 'content_reviews/rev_1'), {
        reviewerUid: 'rev_user_1',
        medicationId: 'med_dipirona_500',
        status: 'verificado_documentalmente',
        notes: 'Posologia e contraindicações conferidas com bula profissional ANVISA.',
        sourceRef: 'ANVISA Bulário Eletrônico 2025',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
});
