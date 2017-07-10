

export function emitAction({ socket, eventName ,message  }) {
    socket.emit(eventName,message);
}
