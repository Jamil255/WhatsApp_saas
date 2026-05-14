import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface QrEvent {
  event: string;
  data: any;
}

@Injectable()
export class QrEventService {
  private readonly subjects = new Map<string, Subject<QrEvent>>();

  emit(tenantId: string, event: QrEvent): void {
    let subject = this.subjects.get(tenantId);
    if (!subject) {
      subject = new Subject<QrEvent>();
      this.subjects.set(tenantId, subject);
    }
    subject.next(event);
  }

  getStream(tenantId: string): Observable<MessageEvent> {
    let subject = this.subjects.get(tenantId);
    if (!subject) {
      subject = new Subject<QrEvent>();
      this.subjects.set(tenantId, subject);
    }

    return subject.asObservable().pipe(
      map(
        (event) =>
          ({
            data: JSON.stringify(event),
            type: event.event,
          }) as any,
      ),
    );
  }

  cleanup(tenantId: string): void {
    const subject = this.subjects.get(tenantId);
    if (subject) {
      subject.complete();
      this.subjects.delete(tenantId);
    }
  }
}
