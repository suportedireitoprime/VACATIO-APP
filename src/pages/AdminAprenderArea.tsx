import { useNavigate, useParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import AprenderPorLivroTab from '@/components/admin/AprenderPorLivroTab';

const AdminAprenderArea = () => {
  const navigate = useNavigate();
  const { area: areaParam } = useParams();
  const area = decodeURIComponent(areaParam || '');
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  const mobileHeader = (
    <PageHeader title={area || 'Categoria'} onBack={() => navigate('/admin-aprender')} />
  );

  if (!isAdmin) {
    return (
      <DesktopPageLayout activeId="admin" title="Admin — Aprender" mobileHeader={mobileHeader}>
        <div className="p-8 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10" />
          Apenas administradores.
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <DesktopPageLayout
      activeId="admin"
      title={area || 'Categoria'}
      subtitle="Livros da matéria"
      mobileHeader={mobileHeader}
    >
      <div className="px-3 sm:px-6 py-4 sm:py-6 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full">
        <AprenderPorLivroTab area={area} />
      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprenderArea;
