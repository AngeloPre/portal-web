import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { StatusStepperStep } from '@shared/components/status-stepper/status-stepper.component';

import { AppDialogService } from '@/app/services/app-dialog.service';
import { LoginService } from '@/app/services/login.service';

import {
  StatusPropostaDialogComponent,
  StatusPropostaDialogData,
} from './status-proposta-dialog/status-proposta-dialog.component';

type StatusKey = 'qualification' | 'pending' | 'progress' | 'finished' | 'cancelled';
type FilterKey = 'all' | 'pending' | 'progress' | 'finished' | 'cancelled';

interface PendingReviewNotice {
  deadline: string;
  message: string;
  reminder?: string;
}

interface Orcamento {
  id: string;
  proposalName: string;
  createdAt: string;
  company: string;
  externalContact: string;
  estimatedValue?: string;
  status: StatusKey;
  pendingReview?: PendingReviewNotice;
}

interface StatusBadge {
  label: string;
  badgeClass: string;
}

interface FilterTab {
  value: FilterKey;
  label: string;
  matches: ReadonlySet<StatusKey> | 'all';
}

const STATUS_BADGE: Record<StatusKey, StatusBadge> = {
  qualification: { label: 'Qualificação', badgeClass: 'orcamento-status-pill--qualification' },
  pending: { label: 'Pendente de Aceite', badgeClass: 'orcamento-status-pill--pending' },
  progress: { label: 'Em Andamento', badgeClass: 'orcamento-status-pill--progress' },
  finished: { label: 'Finalizado', badgeClass: 'orcamento-status-pill--finished' },
  cancelled: { label: 'Cancelado', badgeClass: 'orcamento-status-pill--cancelled' },
};

const PROPOSAL_STEPS: ReadonlyArray<StatusStepperStep> = [
  { key: 'qualification', label: 'Qualificação' },
  { key: 'analysis', label: 'Em análise pela área', icon: 'hourglass_empty' },
  { key: 'drafting', label: 'Elaborando proposta', icon: 'description' },
  { key: 'negotiation', label: 'Em negociação', icon: 'attach_money' },
  { key: 'accepted', label: 'Aprovado pelo cliente', icon: 'how_to_reg' },
  { key: 'awaiting-sample', label: 'Aguardando entrega da amostra', icon: 'inventory_2' },
  { key: 'received', label: 'Recebido', icon: 'check_circle' },
];

const STATUS_TO_STEP_INDEX: Record<StatusKey, number> = {
  qualification: 0,
  pending: 1,
  progress: 3,
  finished: 6,
  cancelled: 0,
};

const FILTER_TABS: ReadonlyArray<FilterTab> = [
  { value: 'all', label: 'Todos', matches: 'all' },
  {
    value: 'pending',
    label: 'Pendentes de aceite',
    matches: new Set<StatusKey>(['qualification', 'pending']),
  },
  { value: 'progress', label: 'Em Andamento', matches: new Set<StatusKey>(['progress']) },
  { value: 'finished', label: 'Finalizados', matches: new Set<StatusKey>(['finished']) },
  { value: 'cancelled', label: 'Cancelados', matches: new Set<StatusKey>(['cancelled']) },
];

const MOCK_ORCAMENTOS: ReadonlyArray<Orcamento> = [
  {
    id: '#EAQ_2026_33322_V_3',
    proposalName: 'Análise de polímeros',
    createdAt: '20/11/2026',
    company: 'ENGIE Brasil',
    externalContact: 'Bruno Pereira',
    status: 'qualification',
  },
  {
    id: '#EAQ_2026_45482_V_1',
    proposalName: 'Análise de óleo isolante',
    createdAt: '15/10/2026',
    company: 'Copel Distribuição',
    externalContact: 'Junior da Silva',
    estimatedValue: 'R$ 12.500,00',
    status: 'pending',
    pendingReview: {
      deadline: '29/10/2026',
      message:
        'Esta proposta técnica está pronta para execução. Por favor, revise os termos e custos associados para prosseguir com a análise laboratorial.',
      reminder:
        'Ao aceitar a proposta não esqueça de identificar suas amostras e anexar o orçamento à caixa enviada.',
    },
  },
  {
    id: '#EAQ_2026_45490_V_2',
    proposalName: 'Ensaio de materiais compósitos',
    createdAt: '18/10/2026',
    company: 'Petrobras',
    externalContact: 'Pedro bom de Bola',
    estimatedValue: 'R$ 18.200,00',
    status: 'progress',
  },
  {
    id: '#EAQ_2026_45490_V_3',
    proposalName: 'Análise de água potável',
    createdAt: '20/10/2026',
    company: 'Sanepar',
    externalContact: 'Joselito Bueno',
    estimatedValue: 'R$ 8.500,00',
    status: 'finished',
  },
];

@Component({
  selector: 'app-client-orcamentos',
  standalone: true,
  imports: [NgClass, FormsModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './orcamentos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientOrcamentosComponent {
  private readonly loginService = inject(LoginService);
  private readonly appDialog = inject(AppDialogService);

  readonly filterTabs = FILTER_TABS;
  readonly activeFilter = signal<FilterKey>('all');
  readonly searchTerm = signal('');

  readonly firstName = computed(() => {
    const name = this.loginService.currentUser();
    if (!name) return 'Cliente';
    return name.split(/\s+/)[0];
  });

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  });

  readonly mobileFilterLabel = computed(() => {
    const current = this.activeFilter();
    if (current === 'all') return 'Todos';
    return FILTER_TABS.find((tab) => tab.value === current)?.label ?? 'Todos';
  });

  readonly orcamentos = signal<ReadonlyArray<Orcamento>>(MOCK_ORCAMENTOS);

  readonly visibleOrcamentos = computed(() => {
    const filter = this.activeFilter();
    const term = this.searchTerm().trim().toLowerCase();
    return this.orcamentos().filter((orcamento) => {
      if (filter !== 'all') {
        const tab = FILTER_TABS.find((t) => t.value === filter);
        if (tab && tab.matches !== 'all' && !tab.matches.has(orcamento.status)) return false;
      }
      if (!term) return true;
      return (
        orcamento.id.toLowerCase().includes(term) ||
        orcamento.proposalName.toLowerCase().includes(term) ||
        orcamento.company.toLowerCase().includes(term) ||
        orcamento.externalContact.toLowerCase().includes(term)
      );
    });
  });

  badgeFor(status: StatusKey): StatusBadge {
    return STATUS_BADGE[status];
  }

  setFilter(value: FilterKey): void {
    this.activeFilter.set(value);
  }

  openStatusDialog(orcamento: Orcamento): void {
    const data: StatusPropostaDialogData = {
      proposalId: orcamento.id.replace(/^#/, ''),
      steps: PROPOSAL_STEPS,
      currentIndex: STATUS_TO_STEP_INDEX[orcamento.status],
      message: orcamento.pendingReview?.message,
      callToAction: orcamento.estimatedValue ? 'Ver o orçamento' : undefined,
    };
    this.appDialog.open(StatusPropostaDialogComponent, data);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }
}
