import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { StatusStepperStep } from '@shared/components/status-stepper/status-stepper.component';

import { Quote } from '@/app/model/quote';
import { AppDialogService } from '@/app/services/app-dialog.service';
import { LoginService } from '@/app/services/login.service';
import { QuotesService } from '@/app/services/quotes.service';

import {
  StatusPropostaDialogComponent,
  StatusPropostaDialogData,
} from './status-proposta-dialog/status-proposta-dialog.component';

// Etapas do orçamento = StageName da Opportunity (Salesforce), progressão linear.
// Hoje só temos as etapas do Salesforce; a parte pós-amostra virá do AutoLab.
type StatusKey =
  | 'qualification'
  | 'analysis'
  | 'drafting'
  | 'negotiation'
  | 'accepted'
  | 'awaiting-sample'
  | 'received'
  | 'incomplete'
  | 'complete'
  | 'validated'
  | 'finalized'
  | 'drafting-report'
  | 'report-published'
  | 'cancelled';
type FilterKey = 'all' | 'pending' | 'progress' | 'finished' | 'cancelled';

interface PendingReviewNotice {
  deadline: string;
  message: string;
  reminder?: string;
}

interface Orcamento {
  id: string;
  code: string;
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
  matches: ReadonlySet<StatusKey>;
}

// O badge mostra a etapa real do Salesforce; a cor reaproveita as 5 pills existentes.
const STATUS_BADGE: Record<StatusKey, StatusBadge> = {
  qualification: { label: 'Qualificação', badgeClass: 'orcamento-status-pill--qualification' },
  analysis: { label: 'Em Análise pela Área', badgeClass: 'orcamento-status-pill--analysis' },
  drafting: { label: 'Elaborando Proposta', badgeClass: 'orcamento-status-pill--drafting' },
  negotiation: { label: 'Em Negociação', badgeClass: 'orcamento-status-pill--negotiation' },
  accepted: { label: 'Aprovado pelo Cliente', badgeClass: 'orcamento-status-pill--accepted' },
  'awaiting-sample': {
    label: 'Aguardando Entrega da Amostra',
    badgeClass: 'orcamento-status-pill--awaiting-sample',
  },
  received: { label: 'Recebido', badgeClass: 'orcamento-status-pill--received' },
  incomplete: { label: 'Incompleto', badgeClass: 'orcamento-status-pill--incomplete' },
  complete: { label: 'Completo', badgeClass: 'orcamento-status-pill--complete' },
  validated: { label: 'Validado', badgeClass: 'orcamento-status-pill--validated' },
  finalized: { label: 'Finalizado', badgeClass: 'orcamento-status-pill--finalized' },
  'drafting-report': {
    label: 'Elaborando Relatório',
    badgeClass: 'orcamento-status-pill--drafting-report',
  },
  'report-published': {
    label: 'Relatório Publicado',
    badgeClass: 'orcamento-status-pill--report-published',
  },
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
  { key: 'incomplete', label: 'Incompleto', icon: 'warning_amber' },
  { key: 'complete', label: 'Completo', icon: 'done_all' },
  { key: 'validated', label: 'Validado', icon: 'verified' },
  { key: 'finalized', label: 'Finalizado', icon: 'task_alt' },
  { key: 'drafting-report', label: 'Elaborando relatório', icon: 'article' },
  { key: 'report-published', label: 'Relatório publicado', icon: 'cloud_done' },
];

// Cada etapa aponta para sua posição no stepper (mesma ordem do PROPOSAL_STEPS).
const STATUS_TO_STEP_INDEX: Record<StatusKey, number> = {
  qualification: 0,
  analysis: 1,
  drafting: 2,
  negotiation: 3,
  accepted: 4,
  'awaiting-sample': 5,
  received: 6,
  incomplete: 7,
  complete: 8,
  validated: 9,
  finalized: 10,
  'drafting-report': 11,
  'report-published': 12,
  cancelled: 0,
};

const PENDING_STATUSES: ReadonlyArray<StatusKey> = [
  'qualification',
  'analysis',
  'drafting',
  'negotiation',
];
const PROGRESS_STATUSES: ReadonlyArray<StatusKey> = [
  'accepted',
  'awaiting-sample',
  'received',
  'incomplete',
  'complete',
  'validated',
  'finalized',
  'drafting-report',
];
const FINISHED_STATUSES: ReadonlyArray<StatusKey> = ['report-published'];

const FILTER_TABS: ReadonlyArray<FilterTab> = [
  {
    value: 'all',
    label: 'Todos',
    matches: new Set<StatusKey>([
      ...PENDING_STATUSES,
      ...PROGRESS_STATUSES,
      ...FINISHED_STATUSES,
    ]),
  },
  {
    value: 'pending',
    label: 'Pendentes de aceite',
    matches: new Set<StatusKey>(PENDING_STATUSES),
  },
  {
    value: 'progress',
    label: 'Em Andamento',
    matches: new Set<StatusKey>(PROGRESS_STATUSES),
  },
  {
    value: 'finished',
    label: 'Finalizados',
    matches: new Set<StatusKey>(FINISHED_STATUSES),
  },
  { value: 'cancelled', label: 'Cancelados', matches: new Set<StatusKey>(['cancelled']) },
];

// Placeholder para o único campo que a API de Quote ainda não expõe (Contato Externo).
const FIELD_PLACEHOLDER = '—';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

// CreatedDate vem do Salesforce em ISO 8601 (ex.: 2026-03-13T13:16:07.000+0000).
function formatCreatedAt(createdDate: string | null): string {
  if (!createdDate) return FIELD_PLACEHOLDER;
  const date = new Date(createdDate);
  return Number.isNaN(date.getTime()) ? FIELD_PLACEHOLDER : DATE_FORMATTER.format(date);
}

// StageName cru da Opportunity -> etapa interna. Match exato (case-insensitive) com os
// valores conhecidos do Salesforce; o regex cobre variações futuras e cai em 'qualification'.
const STAGE_BY_NAME: Record<string, StatusKey> = {
  'qualificação': 'qualification',
  'em análise pela área': 'analysis',
  'em revisão': 'analysis',
  'elaborando proposta': 'drafting',
  'negociação': 'negotiation',
  'aprovado pelo cliente': 'accepted',
  'aguardando entrega da amostra': 'awaiting-sample',
  'fechado ganho': 'received',
  'fechado perdido': 'cancelled',
  'fechado recusado lactec': 'cancelled',
  'cancelado': 'cancelled',
};

function mapStage(rawStage: string): StatusKey {
  const stage = rawStage.trim().toLowerCase();
  const exact = STAGE_BY_NAME[stage];
  if (exact) return exact;

  if (/(perdid|recus|cancel|reject|denied|negad)/.test(stage)) return 'cancelled';
  if (/(ganho|won|recebid|conclu|complete)/.test(stage)) return 'received';
  if (/amostra/.test(stage)) return 'awaiting-sample';
  if (/(aprovad|aceit|accept|approv)/.test(stage)) return 'accepted';
  if (/negocia/.test(stage)) return 'negotiation';
  if (/(elabor|draft|propost)/.test(stage)) return 'drafting';
  if (/(análise|analise|revis|review|analysis)/.test(stage)) return 'analysis';
  return 'qualification';
}

// Contato externo: prioriza o nome; quando só há e-mail, usa o e-mail.
function resolveExternalContact(quote: Quote): string {
  return quote.externalContactName?.trim() || quote.externalContactEmail?.trim() || FIELD_PLACEHOLDER;
}

// Sem fallbacks inventados: exibimos apenas o que vem do Salesforce.
function mapQuoteToOrcamento(quote: Quote): Orcamento {
  const hasValue = typeof quote.totalPrice === 'number' && quote.totalPrice > 0;

  return {
    id: quote.id?.trim() || '',
    code: quote.code?.trim() || FIELD_PLACEHOLDER,
    proposalName: quote.name?.trim() || FIELD_PLACEHOLDER,
    company: quote.companyName?.trim() || FIELD_PLACEHOLDER,
    externalContact: resolveExternalContact(quote),
    createdAt: formatCreatedAt(quote.createdDate),
    estimatedValue: hasValue ? BRL_FORMATTER.format(quote.totalPrice) : undefined,
    status: mapStage(quote.stage ?? ''),
  };
}

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
  private readonly quotesService = inject(QuotesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filterTabs = FILTER_TABS;
  readonly activeFilter = signal<FilterKey>('all');
  readonly searchTerm = signal('');
  readonly loadError = signal(false);

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

  readonly orcamentos = signal<ReadonlyArray<Orcamento>>([]);

  readonly visibleOrcamentos = computed(() => {
    const filter = this.activeFilter();
    const term = this.searchTerm().trim().toLowerCase();
    const tab = FILTER_TABS.find((t) => t.value === filter);
    return this.orcamentos().filter((orcamento) => {
      if (tab && !tab.matches.has(orcamento.status)) return false;
      if (!term) return true;
      return (
        orcamento.code.toLowerCase().includes(term) ||
        orcamento.proposalName.toLowerCase().includes(term) ||
        orcamento.company.toLowerCase().includes(term) ||
        orcamento.externalContact.toLowerCase().includes(term)
      );
    });
  });

  constructor() {
    this.loadQuotes();
  }

  private loadQuotes(): void {
    this.loadError.set(false);
    this.quotesService
      .getQuotes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (quotes) => this.orcamentos.set(quotes.map(mapQuoteToOrcamento)),
        error: () => {
          this.orcamentos.set([]);
          this.loadError.set(true);
        },
      });
  }

  badgeFor(status: StatusKey): StatusBadge {
    return STATUS_BADGE[status];
  }

  setFilter(value: FilterKey): void {
    this.activeFilter.set(value);
  }

  openStatusDialog(orcamento: Orcamento): void {
    const data: StatusPropostaDialogData = {
      proposalId: orcamento.code.replace(/^#/, ''),
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
