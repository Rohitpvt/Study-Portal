import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Chat from '../Chat';
import React from 'react';

// Mock Lucide icons to avoid rendering complexities in JSDOM
vi.mock('lucide-react', () => ({
  Send: () => <div data-testid="send-icon" />,
  Bot: () => <div data-testid="bot-icon" />,
  User: () => <div data-testid="user-icon" />,
  BookOpen: () => <div data-testid="book-icon" />,
  FileText: () => <div data-testid="file-icon" />,
  Info: () => <div data-testid="info-icon" />,
}));

// Setup MSW for API mocking
const handlers = [
  http.post('http://localhost:8000/api/v1/chat/ask', async ({ request }) => {
    const { query } = await request.json();
    
    if (query.includes('academic')) {
      return HttpResponse.json({
        session_id: 'test-session',
        answer: 'This is an academic answer.',
        mode: 'document',
        sources: [
          {
            title: 'Verified Source',
            source_file: 'academic.pdf',
            page_number: 10,
            material_id: 'm1',
            subject: 'History',
            course: 'BCA',
            semester: 1
          }
        ]
      });
    }
    
    return HttpResponse.json({
      session_id: 'test-session',
      answer: 'This is a general answer.',
      mode: 'general',
      sources: []
    });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
});
afterAll(() => server.close());

describe('Chat Component', () => {
  it('renders initial welcome message', () => {
    render(<Chat />);
    expect(screen.getByText(/Hello! I am your AI Study Assistant/i)).toBeInTheDocument();
  });

  it('handles general knowledge query and displays mode badge', async () => {
    render(<Chat />);
    const input = screen.getByPlaceholderText(/Type your academic question here/i);
    const sendButton = screen.getByTestId('send-icon').parentElement;

    fireEvent.change(input, { target: { value: 'Hi' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('This is a general answer.')).toBeInTheDocument();
    });
    // Multiples since the initial message also has this mode
    expect(screen.getAllByText(/Answered from general knowledge/i).length).toBeGreaterThan(0);
  });

  it('handles academic query and displays source chips', async () => {
    render(<Chat />);
    const input = screen.getByPlaceholderText(/Type your academic question here/i);
    const sendButton = screen.getByTestId('send-icon').parentElement;

    fireEvent.change(input, { target: { value: 'academic question' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('This is an academic answer.')).toBeInTheDocument();
    });

    expect(screen.getByText(/Answered from uploaded materials/i)).toBeInTheDocument();
    expect(screen.getByText('Verified Source')).toBeInTheDocument();
    expect(screen.getByText('PG 10')).toBeInTheDocument();
    expect(screen.getByText('academic.pdf')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });
});
