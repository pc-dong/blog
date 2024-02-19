---
icon: edit
date: 2024-02-18
category:
  - 响应式编程
tag:
  - java
  - nio
---

# Java Socket编程02 - 非阻塞IO & IO 多路复用

## 非阻塞IO 

非阻塞IO是指当用户线程发起IO请求后，内核会立即返回，不会阻塞用户线程，用户线程可以继续做其他事情，通过轮询的方式检查IO操作是否完成。

单纯的使用非阻塞IO，不能显著提高IO效率，因为轮询的方式会消耗大量的CPU资源。因此，非阻塞IO通常与IO多路复用结合使用。

## Java中的非阻塞IO

Java中的非阻塞IO相关工具类库在`java.nio`包下，Socket相关类主要有`ServerSocketChannel` 和 `SocketChannel`, 两者均可通过configureBlocking(boolean block) 设置阻塞和非阻塞模式。

* 阻塞模式
    
    阻塞模式下，`access`、`read`、`write`方法会阻塞，直到IO操作完成, 以下是一个阻塞模式的例子。

```java
@Slf4j
public class Server {
    private final int port;

    public Server(int port) {
        this.port = port;
    }

    public void start() {
        ByteBuffer buffer = ByteBuffer.allocate(1024);
        try (ServerSocketChannel serverSocket = ServerSocketChannel.open()) {
            serverSocket.bind(new InetSocketAddress(port));
            serverSocket.configureBlocking(true); // blocking mode
            log.info("server started");
            try (SocketChannel clientSocket = serverSocket.accept()) {
                log.info("client connected");
                clientSocket.configureBlocking(true); // blocking mode

                buffer.clear();
                clientSocket.read(buffer);
                buffer.flip();
                String greeting = new String(buffer.array()).trim();
                log.info("received: {}", greeting);

                if ("hello server".equals(greeting)) {
                    clientSocket.write(ByteBuffer.wrap("hello client".getBytes()));
                } else {
                    clientSocket.write(ByteBuffer.wrap("unrecognised greeting".getBytes()));
                }
            }
        } catch (IOException e) {
            log.error("error", e);
        }
    }
}


public class Client {
    public String sendMessage(String message, String host, int port) {
        ByteBuffer buffer = ByteBuffer.allocate(1024);

        try (SocketChannel client = SocketChannel.open(new InetSocketAddress(host, port))) {
            client.write(ByteBuffer.wrap(message.getBytes()));
            client.read(buffer);
            buffer.flip();
            return new String(buffer.array()).trim();
        } catch (java.io.IOException e) {
            throw new RuntimeException(e);
        }
    }
}

class ServerTest {
    @Test
    void start() {
        int port = 6666;
        Server server = new Server(port);
        new Thread(server::start).start();

        Client client = new Client();
        String result = client.sendMessage("hello server", "localhost", port);
        Assertions.assertEquals("hello client", result);
    }
}
```

* 非阻塞模式

    非阻塞模式下，`access`、`read`、`write`方法会立即返回，不会阻塞, 需要通过轮询的方式检查IO操作是否完成。以下是对服务端非阻塞模式的例子

```java
@Slf4j
public class Server {
    private final int port;

    public Server(int port) {
        this.port = port;
    }

    public void start() {
        ByteBuffer buffer = ByteBuffer.allocate(1024);
        try (ServerSocketChannel serverSocket = ServerSocketChannel.open()) {
            serverSocket.bind(new InetSocketAddress(port));
            serverSocket.configureBlocking(false); // non-blocking mode
            log.info("server started");
            SocketChannel clientSocket = null;
            do {
                clientSocket = serverSocket.accept();
            } while (clientSocket == null);


            clientSocket.configureBlocking(false); // non-blocking mode

            buffer.clear();
            while (clientSocket.read(buffer) == 0) {
                // wait for data
            }
            buffer.flip();
            String greeting = new String(buffer.array()).trim();
            log.info("received: {}", greeting);

            log.info("client connected");
            if ("hello server".equals(greeting)) {
                clientSocket.write(ByteBuffer.wrap("hello client".getBytes()));
            } else {
                clientSocket.write(ByteBuffer.wrap("unrecognised greeting".getBytes()));
            }
        } catch (Exception e) {
            log.error("error", e);
        }
    }
}
```

## IO多路复用

IO多路复用是指内核提供了一种机制，可以同时监控多个IO操作，当某个IO操作完成时，内核会通知用户线程。常见的IO多路复用有`select`、`poll`、`epoll`、`kqueue`、`IOCP`等，其中`select`、`poll`支持跨平台但效率相对较低、`epoll`仅Linux系统支持，`kqueue`仅BSD、MACOS等支持、IOCP仅Windows支持。

Java中的IO多路复用主要是通过`Selector`类实现的，`Selector`类可以注册多个`Channel`，并通过`select`方法监听这些`Channel`的IO事件。

`Selector`在JDK层面对不同的操作系统实现了不同的策略，比如在Linux系统上会使用`epoll`，在Windows系统上会使用`IOCP`，从而统一应用层面的使用方式。

`Selector`的事件类型有四种：`OP_ACCEPT`、`OP_CONNECT`、`OP_READ`、`OP_WRITE`。`OP_ACCEPT`用于监听`ServerSocketChannel`的连接事件，`OP_CONNECT`用于监听`SocketChannel`的连接事件，`OP_READ`用于监听`SocketChannel`的读事件，`OP_WRITE`用于监听`SocketChannel`的写事件。


利用IO多路复用我们结合非阻塞IO可以实现通过少量线程处理大量IO请求，提高并发处理效率。以下是一个简单的例子：

```java
@Slf4j
public class Server {
    private final int port;

    public Server(int port) {
        this.port = port;
    }

    public void start() {
        ByteBuffer buffer = ByteBuffer.allocate(1024);
        try (ServerSocketChannel serverSocket = ServerSocketChannel.open();
             Selector selector = Selector.open();
        ) {
            serverSocket.bind(new InetSocketAddress(port));
            serverSocket.configureBlocking(false);

            serverSocket.register(selector, SelectionKey.OP_ACCEPT);

            while (true) {
                selector.select();
                Iterator<SelectionKey> iterator =  selector.selectedKeys().iterator();
                while (iterator.hasNext()) {
                    SelectionKey key = iterator.next();
                    iterator.remove();
                    if (key.isAcceptable()) {
                        SocketChannel clientSocket = serverSocket.accept();
                        clientSocket.configureBlocking(false);
                        clientSocket.register(selector, SelectionKey.OP_READ);
                    }

                    if (key.isReadable()) {
                        SocketChannel clientSocket = (SocketChannel) key.channel();
                        buffer.clear();
                        clientSocket.read(buffer);
                        buffer.flip();
                        String greeting = new String(buffer.array()).trim();
                        log.info("received: {}", greeting);
                        if ("hello server".equals(greeting)) {
                            clientSocket.write(ByteBuffer.wrap("hello client".getBytes()));
                        } else {
                            clientSocket.write(ByteBuffer.wrap("unrecognised greeting".getBytes()));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("error", e);
        }
    }
}
```

这个例子中，我们使用`Selector`监听`ServerSocketChannel`的`OP_ACCEPT`事件，当有新的客户端连接时，我们将其注册到`Selector`中，并监听`OP_READ`事件。当有数据可读时，我们读取数据并返回响应。selector.select()方法会阻塞，直到有事件发生，通过selector.selectedKeys()获取就绪的事件，然后遍历进行处理。由于accept和数据读写、业务处理在一个线程中处理，如果业务方法处理时间过长，则可能会阻塞其他连接处理。因此可以将业务处理放到线程池中处理，来提高并发处理能力。改进后的代码如下所示：

```java
@Slf4j
public class Server {
    private final int port;
    private final ExecutorService threadPool = Executors.newFixedThreadPool(10);

    public Server(int port) {
        this.port = port;
    }

    public void start() {
        ByteBuffer buffer = ByteBuffer.allocate(1024);
        try (ServerSocketChannel serverSocket = ServerSocketChannel.open();
             Selector selector = Selector.open();
        ) {
            serverSocket.bind(new InetSocketAddress(port));
            serverSocket.configureBlocking(false);

            serverSocket.register(selector, SelectionKey.OP_ACCEPT);

            while (true) {
                selector.select();
                Iterator<SelectionKey> iterator =  selector.selectedKeys().iterator();
                while (iterator.hasNext()) {
                    SelectionKey key = iterator.next();
                    iterator.remove();
                    if (key.isAcceptable()) {
                        SocketChannel clientSocket = serverSocket.accept();
                        clientSocket.configureBlocking(false);
                        clientSocket.register(selector, SelectionKey.OP_READ);
                    }

                    if (key.isReadable()) {
                        SocketChannel clientSocket = (SocketChannel) key.channel();
                        buffer.clear();
                        clientSocket.read(buffer);
                        buffer.flip();
                        String greeting = new String(buffer.array()).trim();
                        log.info("received: {}", greeting);
                        threadPool.execute(() -> {
                            try {
                                businessLogic(greeting, clientSocket, selector);
                            } catch (ClosedChannelException e) {
                                log.error("error", e);
                            }
                        });

                    }

                    if (key.isWritable()) {
                        SocketChannel clientSocket = (SocketChannel) key.channel();
                        String message = (String) key.attachment();
                        clientSocket.write(ByteBuffer.wrap(message.getBytes()));
                    }
                }
            }
        } catch (Exception e) {
            log.error("error", e);
        }
    }

    private static void businessLogic(String greeting, SocketChannel clientSocket, Selector selector) throws ClosedChannelException {
        if ("hello server".equals(greeting)) {
            clientSocket.register(selector, SelectionKey.OP_WRITE, "hello client");
        } else {
            clientSocket.register(selector, SelectionKey.OP_WRITE, "unrecognised greeting");
        }
        selector.wakeup();
    }
}
```

这个例子中，我们使用了一个线程池来处理业务逻辑，当有数据可读时，我们将业务逻辑放到线程池中处理，然后将处理结果注册到`Selector`中，通过`selector.wakeup()`方法唤醒`select`方法，使其立即返回，然后处理写事件。这样可以提高并发处理能力。

## 总结

本文介绍了Java中的非阻塞IO和IO多路复用，通过`java.nio`包下的`ServerSocketChannel`、`SocketChannel`和`Selector`类，我们可以实现非阻塞IO和IO多路复用。非阻塞IO和IO多路复用可以提高IO效率，适用于高并发的场景。