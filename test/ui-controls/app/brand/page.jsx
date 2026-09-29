'use client';
import {EmployeeSidebar} from '../../../../app/_components/EmployeeSidebar';
import {EmployeeNavProvider} from '../../../../app/_components/EmployeeNavContext';
import {AppFeedbackProvider} from '../../../../app/_components/AppFeedback';
import {DarkModeProvider} from '../../../../app/_components/DarkModeProvider';
import {AuthShell} from '../../../../app/_components/AuthShell';
import {FormField} from '../../../../app/_components/FormField';
import {S} from '../../../../app/dashboard/dashboard-shared';
export default function BrandPreview() {
 return <DarkModeProvider><AppFeedbackProvider locale="pt-BR"><EmployeeNavProvider>
  <div className="flex min-h-screen"><EmployeeSidebar locale="pt-BR" companyName="Empresa exemplo" />
   <main className="min-w-0 flex-1"><AuthShell locale="pt-BR" context="Gestão / RH" title="Entrar no 30grow" intro="Seu espaço para desenvolver pessoas.">
    <form className="space-y-4" onSubmit={event=>event.preventDefault()}>
     <FormField label="E-mail"><input type="email" className={S.input} /></FormField>
     <FormField label="Senha"><input type="password" className={S.input} /></FormField>
     <div className="flex flex-wrap gap-2"><button className={S.btnPrimary}>Entrar</button><button type="button" className={S.btnGhost}>Voltar</button></div>
    </form>
   </AuthShell></main>
  </div>
 </EmployeeNavProvider></AppFeedbackProvider></DarkModeProvider>;
}
