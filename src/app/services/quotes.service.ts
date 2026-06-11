import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '@/app/environment/env';
import { Quote } from '@/app/model/quote';

// Serviço somente-leitura: o cliente apenas visualiza os orçamentos.
// Mapeia os endpoints GET expostos por QuotesController na API.
@Injectable({ providedIn: 'root' })
export class QuotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/api/quotes`;

  // GET /api/quotes — lista os orçamentos mais recentes.
  getQuotes(): Observable<Quote[]> {
    return this.http.get<Quote[]>(this.baseUrl);
  }

  // GET /api/quotes/{id} — detalha um orçamento específico.
  getQuoteById(id: string): Observable<Quote> {
    return this.http.get<Quote>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
