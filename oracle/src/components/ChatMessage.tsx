'use client';

import {useState} from 'react';
import {cn} from '@/lib/utils';
import {Bot, User, ChevronDown, ChevronUp} from 'lucide-react';

interface ChatMessageProps {
    message: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
        duration?: number;
    };
}

export function ChatMessage({message}: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

    // Check if thinking is in progress (opening tag but no closing tag yet)
    const hasOpenThinkTag = message.content.includes('<think>');
    const hasCloseThinkTag = message.content.includes('</think>');
    const isThinkingInProgress = hasOpenThinkTag && !hasCloseThinkTag;

    // Parse complete thinking tags from content
    const thinkingMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null;

    // Remove thinking tags (both complete and incomplete)
    let mainContent = message.content
        .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove complete tags
        .replace(/<think>[\s\S]*$/g, '') // Remove incomplete opening tag at end
        .replace(/<\/think>/g, '') // Remove stray closing tags
        .trim();

    // Don't render anything if there's no content and no completed thinking
    // This prevents empty message bubbles during initial streaming
    if (!mainContent && !thinkingContent) {
        return null;
    }

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
                {/* Only show message bubble if there's content OR if thinking is complete */}
                {(mainContent || (!isUser && thinkingContent && !isThinkingInProgress)) && (
                    <div
                        className={cn(
                            'rounded-3xl px-5 py-3 shadow-md',
                            isUser
                                ? 'bg-emerald-600 text-white rounded-tr-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-700 rounded-tl-sm'
                        )}
                    >
                        {mainContent && (
                            <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                                {mainContent}
                            </p>
                        )}

                        {/* After thinking complete: show collapsible thinking section inside the message bubble */}
                        {!isUser && thinkingContent && !isThinkingInProgress && (
                            <div className={cn(
                                mainContent ? 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700' : ''
                            )}>
                                <button
                                    onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                >
                                    {isThinkingExpanded ? (
                                        <ChevronUp className="w-4 h-4"/>
                                    ) : (
                                        <ChevronDown className="w-4 h-4"/>
                                    )}
                                    <span className="font-medium">View thinking</span>
                                </button>

                                {isThinkingExpanded && (
                                    <div className="mt-2 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700/50">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words italic">
                                            {thinkingContent}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Timestamp and Duration */}
                <div className={cn(
                    'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-3',
                    isUser ? 'justify-end' : 'justify-start'
                )}>
                    <span>
                        {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                    {!isUser && message.duration && (
                        <>
                            <span>•</span>
                            <span className="font-medium">
                                {(message.duration / 1000).toFixed(1)}s
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
