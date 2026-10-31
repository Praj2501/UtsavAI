import { EventRepository } from './EventRepository.interface';
import { InMemoryEventRepository } from './InMemoryEventRepository';
import { FirestoreEventRepository } from './FirestoreEventRepository';
import { isDemoMode } from '../services/firebase';

let repositoryInstance: EventRepository | null = null;

export function getEventRepository(): EventRepository {
  if (!repositoryInstance) {
    if (isDemoMode) {
      repositoryInstance = new InMemoryEventRepository();
    } else {
      repositoryInstance = new FirestoreEventRepository();
    }
  }
  return repositoryInstance;
}

export function setEventRepository(repo: EventRepository): void {
  repositoryInstance = repo;
}

export * from './EventRepository.interface';
export * from './InMemoryEventRepository';
export * from './FirestoreEventRepository';
