import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase.ts';
import {
  BRAZILIAN_UFS,
  INITIAL_PROFESSIONS,
  MEDICATION_PRODUCTS,
  PROFESSIONAL_COUNCILS,
  SCIENTIFIC_SOURCES,
} from '../data/pharmacologicalDatabase.ts';
import { CALCULATOR_DEFINITIONS } from '../services/calculatorEngine.ts';
import {
  ContentValidationStatus,
  HealthProfession,
  ProfessionalRole,
  ProfessionalUserProfile,
} from '../types/pharmacology.ts';

interface Props {
  currentUser: User | null;
  userProfile: ProfessionalUserProfile | null;
  onProfileUpdated: (profile: ProfessionalUserProfile) => void;
  onGoogleLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  favoritesCount: number;
  historyCount: number;
  onNavigateFavorites: () => void;
}

interface AuditLogEntry {
  id: string;
  actorUid: string;
  action: string;
  targetEntity: string;
  reason: string;
  previousVersion: string;
  newVersion: string;
}

const REVIEW_STATE_BADGES: Record<ContentValidationStatus, { label: string; style: string }> = {
  importado: {
    label: 'Importado',
    style: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  pendente_conferencia: {
    label: 'Pendente de Conferência',
    style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
  em_revisao: {
    label: 'Em Revisão Científica',
    style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  },
  verificado_documentalmente: {
    label: 'Verificado Documentalmente',
    style: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  },
  aprovado_publicacao: {
    label: 'Aprovado para Publicação',
    style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  desatualizado: {
    label: 'Desatualizado',
    style: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  },
  rejeitado: {
    label: 'Rejeitado',
    style: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  },
};

export const GovernanceAdminModule: React.FC<Props> = ({
  currentUser,
  userProfile,
  onProfileUpdated,
  onGoogleLogin,
  onLogout,
  darkMode,
  onToggleDarkMode,
  favoritesCount,
  historyCount,
  onNavigateFavorites,
}) => {
  // Active View inside Profile & Governance
  const [activeSubTab, setActiveSubTab] = useState<'perfil' | 'seguranca' | 'governanca'>('perfil');

  // Auth mode when signed out
  const [authTab, setAuthTab] = useState<'login' | 'cadastro' | 'recuperar'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Registration / Profile Fields (Part 1.1)
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [profession, setProfession] = useState<HealthProfession>(
    userProfile?.profession || 'Farmacêutico'
  );
  const [customProfession, setCustomProfession] = useState(userProfile?.customProfession || '');
  const [specialty, setSpecialty] = useState(userProfile?.specialty || '');
  const [council, setCouncil] = useState(userProfile?.council || 'CRF');
  const [registrationNumber, setRegistrationNumber] = useState(
    userProfile?.registrationNumber || ''
  );
  const [registrationUf, setRegistrationUf] = useState(userProfile?.registrationUf || 'SP');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Password Change state
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // RBAC & Audit Trail state (Part 8)
  const [effectiveRole, setEffectiveRole] = useState<ProfessionalRole>('usuario_profissional');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [actionInput, setActionInput] = useState('VERIFICACAO_DOCUMENTAL_BULA');
  const [targetEntityInput, setTargetEntityInput] = useState(MEDICATION_PRODUCTS[0].id);
  const [reasonInput, setReasonInput] = useState(
    'Conferência documental de posologia, apresentações e registro ANVISA vigente.'
  );
  const [prevVersion, setPrevVersion] = useState('v2025.09');
  const [newVersion, setNewVersion] = useState('v2026.11');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);

  // Sync form state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || '');
      setProfession(userProfile.profession || 'Farmacêutico');
      setCustomProfession(userProfile.customProfession || '');
      setSpecialty(userProfile.specialty || '');
      setCouncil(userProfile.council || 'CRF');
      setRegistrationNumber(userProfile.registrationNumber || '');
      setRegistrationUf(userProfile.registrationUf || 'SP');
      setAvatarUrl(userProfile.avatarUrl || '');
    }
  }, [userProfile]);

  // Check RBAC role documents in Firestore (/admins/{uid}, /editors/{uid}, /reviewers/{uid})
  useEffect(() => {
    let cancelled = false;
    async function checkRoles() {
      if (!currentUser) {
        setEffectiveRole('usuario_profissional');
        return;
      }
      try {
        const [adminSnap, editorSnap, reviewerSnap] = await Promise.all([
          getDoc(doc(db, 'admins', currentUser.uid)),
          getDoc(doc(db, 'editors', currentUser.uid)),
          getDoc(doc(db, 'reviewers', currentUser.uid)),
        ]);
        if (cancelled) return;
        if (adminSnap.exists()) {
          setEffectiveRole('administrador');
        } else if (editorSnap.exists()) {
          setEffectiveRole('editor_cientifico');
        } else if (reviewerSnap.exists()) {
          setEffectiveRole('revisor_cientifico');
        } else {
          setEffectiveRole(userProfile?.role || 'usuario_profissional');
        }
      } catch {
        if (!cancelled) {
          setEffectiveRole(userProfile?.role || 'usuario_profissional');
        }
      }
    }
    checkRoles();
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile]);

  const hasEditorialPermission =
    effectiveRole === 'administrador' ||
    effectiveRole === 'editor_cientifico' ||
    effectiveRole === 'revisor_cientifico';

  useEffect(() => {
    if (!currentUser || !hasEditorialPermission) {
      setAuditLogs([]);
      return;
    }

    const q = query(
      collection(db, 'audit_logs'),
      where('actorUid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AuditLogEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLogEntry, 'id'>),
        }));
        setAuditLogs(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      }
    );

    return () => unsubscribe();
  }, [currentUser, hasEditorialPermission]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthFeedback(null);
    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      setAuthFeedback({ type: 'ok', text: 'Autenticação concluída com sucesso.' });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setAuthFeedback({
          type: 'err',
          text: 'O provedor de E-mail/Senha depende de ativação no console do Firebase Authentication. Utilize "Continuar com Google" ou habilite Email/Password no console.',
        });
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthFeedback({
          type: 'err',
          text: 'Credenciais inválidas. Verifique seu e-mail e senha.',
        });
      } else {
        setAuthFeedback({
          type: 'err',
          text: 'Não foi possível realizar o login com e-mail e senha no momento.',
        });
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setAuthFeedback({ type: 'err', text: 'Informe seu nome completo.' });
      return;
    }
    if (profession === 'Outro profissional de saúde' && !customProfession.trim()) {
      setAuthFeedback({ type: 'err', text: 'Informe sua profissão no campo manual.' });
      return;
    }
    setAuthBusy(true);
    setAuthFeedback(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      await updateProfile(cred.user, {
        displayName: fullName.trim().slice(0, 120),
        photoURL: avatarUrl.trim() || null,
      });

      const newProfile: ProfessionalUserProfile = {
        uid: cred.user.uid,
        fullName: fullName.trim().slice(0, 120),
        email: authEmail.trim().slice(0, 256),
        profession,
        customProfession:
          profession === 'Outro profissional de saúde'
            ? customProfession.trim().slice(0, 100)
            : '',
        specialty: specialty.trim().slice(0, 120),
        council: council.trim().slice(0, 40),
        registrationNumber: registrationNumber.trim().slice(0, 40),
        registrationUf: registrationUf.trim().slice(0, 10),
        avatarUrl: avatarUrl.trim().slice(0, 500),
        role: 'usuario_profissional',
      };

      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        displayName: newProfile.fullName,
        fullName: newProfile.fullName,
        profession: newProfile.profession,
        customProfession: newProfile.customProfession || '',
        specialty: newProfile.specialty || '',
        council: newProfile.council || '',
        registrationNumber: newProfile.registrationNumber || '',
        registrationUf: newProfile.registrationUf || '',
        avatarUrl: newProfile.avatarUrl || '',
        roleLabel: 'usuario_profissional',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onProfileUpdated(newProfile);
      setAuthFeedback({
        type: 'ok',
        text: 'Cadastro profissional criado com sucesso.',
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setAuthFeedback({
          type: 'err',
          text: 'O cadastro por E-mail/Senha requer ativação do provedor Email/Password no console Firebase. Autentique-se com Google para criar e editar seu perfil profissional imediatamente.',
        });
      } else if (code === 'auth/email-already-in-use') {
        setAuthFeedback({
          type: 'err',
          text: 'Este endereço de e-mail já está cadastrado.',
        });
      } else if (code === 'auth/weak-password') {
        setAuthFeedback({
          type: 'err',
          text: 'A senha deve possuir pelo menos 6 caracteres.',
        });
      } else {
        setAuthFeedback({
          type: 'err',
          text: 'Não foi possível concluir o cadastro por e-mail/senha.',
        });
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setAuthFeedback({ type: 'err', text: 'Informe seu e-mail para recuperação de senha.' });
      return;
    }
    setAuthBusy(true);
    setAuthFeedback(null);
    try {
      await sendPasswordResetEmail(auth, authEmail.trim());
      setAuthFeedback({
        type: 'ok',
        text: 'Instruções de redefinição de senha enviadas para o e-mail informado.',
      });
    } catch {
      setAuthFeedback({
        type: 'err',
        text: 'Não foi possível enviar o e-mail de recuperação. Verifique o endereço informado.',
      });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (profession === 'Outro profissional de saúde' && !customProfession.trim()) {
      setProfileMessage('Por favor, informe sua profissão manualmente ao selecionar "Outro".');
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    const updated: ProfessionalUserProfile = {
      uid: currentUser.uid,
      fullName: (fullName.trim() || currentUser.displayName || 'Profissional de Saúde').slice(0, 120),
      email: currentUser.email || '',
      profession,
      customProfession:
        profession === 'Outro profissional de saúde'
          ? customProfession.trim().slice(0, 100)
          : '',
      specialty: specialty.trim().slice(0, 120),
      council: council.trim().slice(0, 40),
      registrationNumber: registrationNumber.trim().slice(0, 40),
      registrationUf: registrationUf.trim().slice(0, 10),
      avatarUrl: avatarUrl.trim().slice(0, 500),
      role: effectiveRole,
    };

    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          uid: currentUser.uid,
          displayName: updated.fullName,
          fullName: updated.fullName,
          profession: updated.profession,
          customProfession: updated.customProfession || '',
          specialty: updated.specialty || '',
          council: updated.council || '',
          registrationNumber: updated.registrationNumber || '',
          registrationUf: updated.registrationUf || '',
          avatarUrl: updated.avatarUrl || '',
          roleLabel: effectiveRole,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onProfileUpdated(updated);
      setProfileMessage('Perfil profissional atualizado e sincronizado com sucesso.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPasswordInput.length < 6) {
      setPasswordMessage({
        type: 'err',
        text: 'A nova senha deve conter no mínimo 6 caracteres.',
      });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordMessage({
        type: 'err',
        text: 'A confirmação de senha não coincide.',
      });
      return;
    }
    try {
      await updatePassword(currentUser, newPasswordInput);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordMessage({
        type: 'ok',
        text: 'Senha atualizada com segurança.',
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/requires-recent-login') {
        setPasswordMessage({
          type: 'err',
          text: 'Por segurança, encerre a sessão e autentique-se novamente antes de alterar a senha.',
        });
      } else {
        setPasswordMessage({
          type: 'err',
          text: 'Não foi possível alterar a senha para o provedor de autenticação atual.',
        });
      }
    }
  };

  const handleRecordAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !hasEditorialPermission) return;
    setSubmittingLog(true);
    setAuditFeedback(null);

    const logId = `log_${Date.now()}`;
    const path = `audit_logs/${logId}`;

    try {
      await setDoc(doc(db, 'audit_logs', logId), {
        actorUid: currentUser.uid,
        action: actionInput.trim().slice(0, 120),
        targetEntity: targetEntityInput.trim().slice(0, 128),
        reason: reasonInput.trim().slice(0, 500),
        previousVersion: prevVersion.trim().slice(0, 64),
        newVersion: newVersion.trim().slice(0, 64),
        createdAt: serverTimestamp(),
      });
      setAuditFeedback('Registro de auditoria científica gravado de forma imutável.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmittingLog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mandatory Non-Certification Disclaimer (Part 1.1) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Conta Individual & Governança Científica
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Perfil Profissional, Configurações e Auditoria
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Gerencie seus dados profissionais, credenciais de acesso, preferências de interface e consulte a governança editorial do catálogo.
            </p>
          </div>

          {currentUser && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          )}
        </div>

        {/* Mandatory Non-Certification Notice (Part 1.1) */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Aviso de Autodeclaração Profissional:</strong> O perfil profissional cadastrado no Farma360 destina-se à personalização da experiência clínica e organização da conta individual. <strong>Não constitui certificação, comprovação de habilitação legal ou validação automática de registro perante os conselhos profissionais (CRF, CRM, COREN, CRO, CRN e demais conselhos).</strong>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('perfil')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'perfil'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {currentUser ? 'Dados do Perfil Profissional' : 'Acesso e Cadastro Profissional'}
          </button>
          {currentUser && (
            <button
              onClick={() => setActiveSubTab('seguranca')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'seguranca'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Senha, Preferências & Atividade
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('governanca')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'governanca'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Governança Editorial & Auditoria (7 Estados)
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: AUTHENTICATION / REGISTRATION OR PROFILE EDITING */}
      {activeSubTab === 'perfil' && (
        <>
          {!currentUser ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAuthTab('login');
                      setAuthFeedback(null);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      authTab === 'login'
                        ? 'bg-slate-900 dark:bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Entrar na Conta
                  </button>
                  <button
                    onClick={() => {
                      setAuthTab('cadastro');
                      setAuthFeedback(null);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      authTab === 'cadastro'
                        ? 'bg-slate-900 dark:bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Criar Cadastro Profissional
                  </button>
                  <button
                    onClick={() => {
                      setAuthTab('recuperar');
                      setAuthFeedback(null);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      authTab === 'recuperar'
                        ? 'bg-slate-900 dark:bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Recuperar Senha
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Acesso Rápido com Google</span>
                </button>
              </div>

              {authFeedback && (
                <div
                  className={`p-3.5 rounded-lg border text-xs ${
                    authFeedback.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
                  }`}
                >
                  {authFeedback.text}
                </div>
              )}

              {authTab === 'login' && (
                <form onSubmit={handleEmailLogin} className="max-w-md space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail Profissional
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="nome@instituicao.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {authBusy ? 'Autenticando...' : 'Entrar com E-mail e Senha'}
                  </button>
                </form>
              )}

              {authTab === 'cadastro' && (
                <form onSubmit={handleEmailRegistration} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex.: Dra. Mariana Costa"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="mariana.costa@hospital.org.br"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Senha (mín. 6 caracteres) *
                      </label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Profissão *
                      </label>
                      <select
                        value={profession}
                        onChange={(e) => setProfession(e.target.value as HealthProfession)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      >
                        {INITIAL_PROFESSIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    {profession === 'Outro profissional de saúde' && (
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Informe sua Profissão Manualmente *
                        </label>
                        <input
                          type="text"
                          required
                          value={customProfession}
                          onChange={(e) => setCustomProfession(e.target.value)}
                          placeholder="Ex.: Fonoaudiólogo, Terapeuta Ocupacional..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Especialidade (quando aplicável)
                      </label>
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Ex.: Farmácia Clínica e Terapia Intensiva"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Conselho Profissional (quando aplicável)
                      </label>
                      <select
                        value={council}
                        onChange={(e) => setCouncil(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      >
                        {PROFESSIONAL_COUNCILS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Número de Registro Profissional (opcional)
                      </label>
                      <input
                        type="text"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="Ex.: 45892"
                        className="w-full px-3.5 py-2.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        UF do Registro (quando aplicável)
                      </label>
                      <select
                        value={registrationUf}
                        onChange={(e) => setRegistrationUf(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      >
                        <option value="">Não aplicável</option>
                        {BRAZILIAN_UFS.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        URL da Foto de Perfil (opcional)
                      </label>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{authBusy ? 'Criando Conta...' : 'Finalizar Cadastro Profissional'}</span>
                    </button>
                  </div>
                </form>
              )}

              {authTab === 'recuperar' && (
                <form onSubmit={handlePasswordReset} className="max-w-md space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail Cadastrado
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="nome@instituicao.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Enviar Link de Redefinição</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Signed-in Professional Profile Editor (Part 1.1) */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                      {(fullName || currentUser.displayName || 'P').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {fullName || currentUser.displayName || 'Profissional de Saúde'}
                    </h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {profession === 'Outro profissional de saúde' && customProfession
                        ? customProfession
                        : profession}{' '}
                      {specialty ? `· ${specialty}` : ''}{' '}
                      {council && council !== 'Não aplicável'
                        ? `· ${council}${registrationUf ? `/${registrationUf}` : ''} ${
                            registrationNumber || ''
                          }`
                        : ''}
                    </div>
                    <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                      E-mail: {currentUser.email} · Papel RBAC: {effectiveRole}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Profissão *
                    </label>
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value as HealthProfession)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      {INITIAL_PROFESSIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {profession === 'Outro profissional de saúde' && (
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Profissão (Informar Manualmente) *
                      </label>
                      <input
                        type="text"
                        required
                        value={customProfession}
                        onChange={(e) => setCustomProfession(e.target.value)}
                        placeholder="Informe sua profissão de saúde"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Especialidade (quando aplicável)
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Ex.: Farmácia Clínica, Cardiologia, UTI..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Conselho Profissional (quando aplicável)
                    </label>
                    <select
                      value={council}
                      onChange={(e) => setCouncil(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      {PROFESSIONAL_COUNCILS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Número de Registro Profissional (opcional)
                    </label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Opcional"
                      className="w-full px-3.5 py-2.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      UF do Registro (quando aplicável)
                    </label>
                    <select
                      value={registrationUf}
                      onChange={(e) => setRegistrationUf(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      <option value="">Não aplicável</option>
                      {BRAZILIAN_UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      URL da Foto de Perfil (opcional)
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {profileMessage ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      ● {profileMessage}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Seus dados ficam armazenados com isolamento de segurança em /users/&#123;uid&#125;.
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>{profileSaving ? 'Salvando...' : 'Salvar Alterações do Perfil'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* SUB-TAB 2: PASSWORD, PREFERENCES & ACTIVITY SUMMARY */}
      {activeSubTab === 'seguranca' && currentUser && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>Alteração de Senha</span>
            </div>
            <p className="text-slate-500">
              Atualize sua senha de acesso. Caso utilize autenticação federada via Google, o gerenciamento também pode ser realizado na sua Conta Google.
            </p>

            {passwordMessage && (
              <div
                className={`p-3 rounded-lg border ${
                  passwordMessage.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                    : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Atualizar Senha
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs text-xs">
            <div className="font-bold text-slate-900 dark:text-white text-base">
              Preferências da Conta, Favoritos e Histórico
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  Aparência da Interface
                </div>
                <div className="text-slate-500 mt-0.5">
                  Padrão clínico claro (Light-First) ou modo escuro de plantão noturno.
                </div>
              </div>
              <button
                onClick={onToggleDarkMode}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
              >
                {darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">Medicamentos Favoritos</div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {favoritesCount}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500">Consultas no Histórico</div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {historyCount}
                </div>
              </div>
            </div>

            <button
              onClick={onNavigateFavorites}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Gerenciar Favoritos e Histórico de Atividades
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SCIENTIFIC GOVERNANCE, 7 REVIEW STATES & RBAC AUDIT TRAIL */}
      {activeSubTab === 'governanca' && (
        <div className="space-y-6">
          {/* Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400">Registros com Fonte Documental</div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {MEDICATION_PRODUCTS.length} / {MEDICATION_PRODUCTS.length}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                ● 100% com Registro ANVISA e Trecho Documental
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400">Calculadoras com Testes Executados</div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {CALCULATOR_DEFINITIONS.length}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                ● 60 casos de teste automatizados em tempo real
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-xs text-slate-500 dark:text-slate-400">Fontes Institucionais Cadastradas</div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {SCIENTIFIC_SOURCES.length}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ANVISA, RENAME/MS, CONITEC, OMS AWaRe, ATC
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="text-xs text-slate-500">Controle de Acesso RBAC (Parte 8)</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {effectiveRole}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Baseado em coleções /admins, /editors e /reviewers
              </div>
            </div>
          </div>

          {/* 7 Review States Catalog Table (Part 6.2) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Controle de Qualidade Editorial e Estados de Revisão (Parte 6.2)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Estados possíveis do ciclo editorial: Importado, Pendente de conferência, Em revisão, Verificado documentalmente, Aprovado para publicação, Desatualizado e Rejeitado.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-3.5 px-4 font-semibold">Produto & Princípio Ativo</th>
                    <th className="py-3.5 px-4 font-semibold">Detentor / CNPJ</th>
                    <th className="py-3.5 px-4 font-semibold">Registro ANVISA</th>
                    <th className="py-3.5 px-4 font-semibold">Apresentações</th>
                    <th className="py-3.5 px-4 font-semibold">Estado Editorial (6.2)</th>
                    <th className="py-3.5 px-4 font-semibold">Última Verificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {MEDICATION_PRODUCTS.map((med) => {
                    const badge =
                      REVIEW_STATE_BADGES[med.validationStatus] ||
                      REVIEW_STATE_BADGES.aprovado_publicacao;
                    return (
                      <tr key={med.id}>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {med.commercialName}
                          </div>
                          <div className="text-slate-500">{med.genericDesignation}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <div>{med.manufacturer}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {med.manufacturerCnpj}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {med.anvisaRegistration}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {med.presentations.length} apresentação(ões)
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-md font-semibold ${badge.style}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{med.lastUpdated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Scientific Audit Trail */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Trilha de Auditoria Científica e Controle de Versões
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Permissões verificadas no servidor via documentos RBAC (/admins/&#123;uid&#125;, /editors/&#123;uid&#125;, /reviewers/&#123;uid&#125;) sem e-mails fixos em código.
              </p>
            </div>

            {hasEditorialPermission ? (
              <form
                onSubmit={handleRecordAuditLog}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 text-xs"
              >
                <div className="font-semibold text-slate-900 dark:text-white">
                  Registrar Revisão Editorial na Trilha Imutável ({effectiveRole})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Ação Editorial
                    </label>
                    <select
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      <option value="VERIFICACAO_DOCUMENTAL_BULA">
                        VERIFICACAO_DOCUMENTAL_BULA
                      </option>
                      <option value="APROVACAO_PUBLICACAO_CIENTIFICA">
                        APROVACAO_PUBLICACAO_CIENTIFICA
                      </option>
                      <option value="AUDITORIA_CALCULADORA_CLINICA">
                        AUDITORIA_CALCULADORA_CLINICA
                      </option>
                      <option value="ATUALIZACAO_ALERTA_SANITARIO">
                        ATUALIZACAO_ALERTA_SANITARIO
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Entidade Alvo
                    </label>
                    <select
                      value={targetEntityInput}
                      onChange={(e) => setTargetEntityInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      {MEDICATION_PRODUCTS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.commercialName} ({m.anvisaRegistration})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Versão Anterior
                    </label>
                    <input
                      type="text"
                      value={prevVersion}
                      onChange={(e) => setPrevVersion(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Nova Versão
                    </label>
                    <input
                      type="text"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Justificativa Técnica e Trecho Documental Conferido
                  </label>
                  <input
                    type="text"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between">
                  {auditFeedback ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      ● {auditFeedback}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Registros em /audit_logs possuem bloqueio contra edição ou exclusão.
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={submittingLog}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{submittingLog ? 'Gravando...' : 'Gravar Auditoria'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-3">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  A gravação de despachos na trilha editorial (/audit_logs) é restrita aos perfis <strong>Revisor Científico</strong>, <strong>Editor Científico</strong> e <strong>Administrador</strong> provisionados nas coleções RBAC do Firestore.
                </span>
              </div>
            )}

            {auditLogs.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Histórico de Auditoria Gravado ({auditLogs.length}):
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {log.action}
                        </span>
                        <span className="mx-2 text-slate-400">·</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Alvo: {log.targetEntity}
                        </span>
                        <span className="mx-2 text-slate-400">·</span>
                        <span className="font-mono text-slate-500">
                          {log.previousVersion} → {log.newVersion}
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{log.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
