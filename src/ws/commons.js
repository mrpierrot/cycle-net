export function sendAction({ socket, message  }) {
    socket.send(message)
}