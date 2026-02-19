function setupSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  return {
    sendChunk(text) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
    },
    sendResult(data) {
      res.write(`data: ${JSON.stringify({ type: 'result', data })}\n\n`);
      res.end();
    },
    sendError(error) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || error })}\n\n`);
      res.end();
    },
  };
}

module.exports = { setupSSE };
