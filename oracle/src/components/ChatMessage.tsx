'use client';

import {cn} from '@/lib/utils';
import {Bot, User} from 'lucide-react';

interface ChatMessageProps {
    message: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    };
}

export function ChatMessage({message}: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                'flex gap-4 items-start',
                isUser ? 'flex-row-reverse' : 'flex-row'
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md',
                    isUser
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                )}
            >
                {isUser ? (
                    <User className="w-5 h-5 text-white"/>
                ) : (
                    <Bot className="w-5 h-5 text-white"/>
                )}
            </div>

            {/* Message Bubble */}
            <div className={cn('flex flex-col gap-2 max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
                <div
                    className={cn(
                        'rounded-3xl px-5 py-3 shadow-md',
                        isUser
                            ? 'bg-emerald-600 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-700 rounded-tl-sm'
                    )}
                >
                    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                    </p>
                </div>

                {/* Timestamp */}
                <span className={cn(
                    'text-xs text-gray-500 dark:text-gray-400 px-3',
                    isUser ? 'text-right' : 'text-left'
                )}>
          {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
          })}
        </span>
            </div>
        </div>
    );
}
