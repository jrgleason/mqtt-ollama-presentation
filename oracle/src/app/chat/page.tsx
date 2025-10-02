import {ChatInterface} from '@/components/ChatInterface';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export default function ChatPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
            <div className="max-w-4xl mx-auto h-screen flex flex-col py-8">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>AI Home Assistant</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-0">
                        <ChatInterface/>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
