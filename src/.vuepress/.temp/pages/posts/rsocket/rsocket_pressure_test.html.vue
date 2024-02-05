<template><div><h1 id="使用jmeter-java-request进行rsocket接口性能测试" tabindex="-1"><a class="header-anchor" href="#使用jmeter-java-request进行rsocket接口性能测试" aria-hidden="true">#</a> 使用Jmeter Java Request进行RSocket接口性能测试</h1>
<h2 id="背景" tabindex="-1"><a class="header-anchor" href="#背景" aria-hidden="true">#</a> 背景</h2>
<blockquote>
<p>上一篇博客<RouterLink to="/posts/rsocket/rsocket_crud.html">《通过自定义注解实现REST风格的RSocket CRUD应用》</RouterLink>介绍了在Spring如何开发RSocket应用，由于RSocket是不同于Http的新的通信协议，目前常见的压测工具都没有提供现成性能测试支持。<br>
Jmeter中提供了Java Request压测方式，可以对Java方法进行压测，我们可以在Java方法中实现RSocket Client端接口调用逻辑，从而实现对RSocket接口的压测。</p>
</blockquote>
<h2 id="引入依赖" tabindex="-1"><a class="header-anchor" href="#引入依赖" aria-hidden="true">#</a> 引入依赖</h2>
<p>通过Spring的RSocketRequester来作为RSocket客户端工具，因此需要引入Spring相关依赖，编写压测方法需要继承实现JavaSamplerClient接口或继承AbstractJavaSamplerClient类，因此旭要引入org.apache.jmeter:ApacheJMeter_java依赖，具体gradle依赖及打包配置如下：</p>
<div class="language-text line-numbers-mode" data-ext="text"><pre v-pre class="language-text"><code>plugins {
    id 'java'
}

def withoutBom = {
    exclude group: 'org.apache.jmeter', module: 'bom'
}

dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter-api:5.8.1'
    testRuntimeOnly 'org.junit.jupiter:junit-jupiter-engine:5.8.1'
    implementation ('io.rsocket:rsocket-core:1.1.3')
    implementation'org.springframework:spring-messaging:5.3.23'
    implementation'org.springframework:spring-web:5.3.23'
    implementation 'com.fasterxml.jackson.dataformat:jackson-dataformat-cbor:2.14.0'
    implementation 'io.rsocket:rsocket-transport-netty:1.1.3'
    compileOnly 'org.apache.jmeter:ApacheJMeter_java:5.5', withoutBom
    testImplementation 'org.apache.jmeter:ApacheJMeter_java:5.5', withoutBom
}

// 将依赖资源都打到一个jar包中
jar {
    enabled=true
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE

    manifest {
        attributes "Main-Class": "xx.xx.Xxxx"
    }

    from {
        configurations.runtimeClasspath.collect { it.isDirectory() ? it : zipTree(it) }
    }
}
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="编写测试代码" tabindex="-1"><a class="header-anchor" href="#编写测试代码" aria-hidden="true">#</a> 编写测试代码</h2>
<p>创建RSocketTest类并继承AbStractJavaSamplerClient，重写setupTest初始化RSocketRequester对象， 重写runTest方法，通过创建的RSocketRequester对象请求RSocket接口，将接口返回结果和响应时间通过SampleResult进行记录。</p>
<div class="language-java line-numbers-mode" data-ext="java"><pre v-pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">class</span> <span class="token class-name">RSocketTest</span> <span class="token keyword">extends</span> <span class="token class-name">AbstractJavaSamplerClient</span> <span class="token punctuation">{</span>
    <span class="token keyword">private</span> <span class="token keyword">static</span> <span class="token class-name">RSocketRequester</span> rsocketRequester<span class="token punctuation">;</span>
    
    <span class="token annotation punctuation">@Override</span>
    <span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">setupTest</span><span class="token punctuation">(</span><span class="token class-name">JavaSamplerContext</span> context<span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">super</span><span class="token punctuation">.</span><span class="token function">setupTest</span><span class="token punctuation">(</span>context<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token class-name">String</span> host <span class="token operator">=</span> context<span class="token punctuation">.</span><span class="token function">getParameter</span><span class="token punctuation">(</span><span class="token string">"host"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">int</span> port <span class="token operator">=</span> context<span class="token punctuation">.</span><span class="token function">getIntParameter</span><span class="token punctuation">(</span><span class="token string">"port"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        rsocketRequester <span class="token operator">=</span> <span class="token class-name">RSocketRequester</span><span class="token punctuation">.</span><span class="token function">builder</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
                <span class="token punctuation">.</span><span class="token function">rsocketStrategies</span><span class="token punctuation">(</span><span class="token class-name">RSocketStrategies</span><span class="token punctuation">.</span><span class="token function">builder</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
                        <span class="token punctuation">.</span><span class="token function">encoders</span><span class="token punctuation">(</span>encoders <span class="token operator">-></span> <span class="token punctuation">{</span>
                            encoders<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Jackson2CborEncoder</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                            encoders<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Jackson2JsonEncoder</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                        <span class="token punctuation">}</span><span class="token punctuation">)</span>
                        <span class="token punctuation">.</span><span class="token function">decoders</span><span class="token punctuation">(</span>decoders <span class="token operator">-></span> <span class="token punctuation">{</span>
                            decoders<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Jackson2JsonDecoder</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                            decoders<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Jackson2CborDecoder</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                        <span class="token punctuation">}</span><span class="token punctuation">)</span>
                        <span class="token punctuation">.</span><span class="token function">build</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
                <span class="token punctuation">.</span><span class="token function">tcp</span><span class="token punctuation">(</span>host<span class="token punctuation">,</span> port<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token annotation punctuation">@Override</span>
    <span class="token keyword">public</span> <span class="token class-name">Arguments</span> <span class="token function">getDefaultParameters</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token class-name">Arguments</span> arguments <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Arguments</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        arguments<span class="token punctuation">.</span><span class="token function">addArgument</span><span class="token punctuation">(</span><span class="token string">"host"</span><span class="token punctuation">,</span> <span class="token string">"127.0.0.1"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        arguments<span class="token punctuation">.</span><span class="token function">addArgument</span><span class="token punctuation">(</span><span class="token string">"port"</span><span class="token punctuation">,</span> <span class="token string">"7001"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">return</span> arguments<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token annotation punctuation">@Override</span>
    <span class="token keyword">public</span> <span class="token class-name">SampleResult</span> <span class="token function">runTest</span><span class="token punctuation">(</span><span class="token class-name">JavaSamplerContext</span> context<span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token class-name">SampleResult</span> sr <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">SampleResult</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token class-name">CountDownLatch</span> countDownLatch <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">CountDownLatch</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">try</span> <span class="token punctuation">{</span>
            sr<span class="token punctuation">.</span><span class="token function">sampleStart</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            rsocketRequester<span class="token punctuation">.</span><span class="token function">route</span><span class="token punctuation">(</span><span class="token string">"toUpperCase"</span><span class="token punctuation">)</span>
                    <span class="token punctuation">.</span><span class="token function">metadata</span><span class="token punctuation">(</span>metadataSpec <span class="token operator">-></span> metadataSpec<span class="token punctuation">.</span><span class="token function">metadata</span><span class="token punctuation">(</span><span class="token string">"111"</span><span class="token punctuation">,</span> 
							<span class="token class-name">MimeType</span><span class="token punctuation">.</span><span class="token function">valueOf</span><span class="token punctuation">(</span><span class="token string">"message/x.client.id"</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
                    <span class="token punctuation">.</span><span class="token function">data</span><span class="token punctuation">(</span><span class="token class-name">DefaultPayload</span><span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token string">"hello"</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
                    <span class="token punctuation">.</span><span class="token function">retrieveMono</span><span class="token punctuation">(</span><span class="token class-name">String</span><span class="token punctuation">.</span><span class="token keyword">class</span><span class="token punctuation">)</span>
                    <span class="token punctuation">.</span><span class="token function">doOnError</span><span class="token punctuation">(</span>error <span class="token operator">-></span> <span class="token punctuation">{</span>
                                sr<span class="token punctuation">.</span><span class="token function">setSuccessful</span><span class="token punctuation">(</span><span class="token boolean">false</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                                error<span class="token punctuation">.</span><span class="token function">printStackTrace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                            <span class="token punctuation">}</span>
                    <span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">doOnSuccess</span><span class="token punctuation">(</span>item <span class="token operator">-></span> <span class="token punctuation">{</span>
                        sr<span class="token punctuation">.</span><span class="token function">setResponseData</span><span class="token punctuation">(</span>item<span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                        sr<span class="token punctuation">.</span><span class="token function">setSuccessful</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
                    <span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">doOnTerminate</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">-></span> countDownLatch<span class="token punctuation">.</span><span class="token function">countDown</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
                    <span class="token punctuation">.</span><span class="token function">subscribe</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            countDownLatch<span class="token punctuation">.</span><span class="token function">await</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span><span class="token class-name">Exception</span> e<span class="token punctuation">)</span> <span class="token punctuation">{</span>
            sr<span class="token punctuation">.</span><span class="token function">setSuccessful</span><span class="token punctuation">(</span><span class="token boolean">false</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            e<span class="token punctuation">.</span><span class="token function">printStackTrace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span> <span class="token keyword">finally</span> <span class="token punctuation">{</span>
            sr<span class="token punctuation">.</span><span class="token function">sampleEnd</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">}</span>

        <span class="token keyword">return</span> sr<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="运行测试步骤" tabindex="-1"><a class="header-anchor" href="#运行测试步骤" aria-hidden="true">#</a> 运行测试步骤</h2>
<ul>
<li>将测试工程打成jar包，放入JMETER_HOME\lib\ext目录</li>
<li>运行Jmeter</li>
<li>右键点击”Test Plan”添加一个Thread Group（线程组）</li>
<li>右键点击线程组，添加一个Java Request</li>
</ul>
<p><img src="@source/posts/rsocket/images/277C7E82-D479-422E-954D-3B9D08874346.png" alt="" loading="lazy"></p>
<ul>
<li>点击该Java Request就能看到之前新建的测试类</li>
</ul>
<p><img src="@source/posts/rsocket/images/962C19EA-29E2-4A5B-88B1-BFA9B0491D6E.png" alt="" loading="lazy"></p>
<ul>
<li>设定参数，双击可修改</li>
<li>右键线程组，添加一个聚合报告</li>
<li>Ctrl+R运行测试计划，在聚合报告查看结果</li>
</ul>
<h2 id="压测结果对比" tabindex="-1"><a class="header-anchor" href="#压测结果对比" aria-hidden="true">#</a> 压测结果对比</h2>
<p>通过上述压测方法，对RSocket API 和Spring WebFlux API 三个场景进行了压测对比，被测应用均运行在2C4G 单个Docker容器中</p>
<ul>
<li>Request/Response模式
被测方法：</li>
</ul>
<div class="language-java line-numbers-mode" data-ext="java"><pre v-pre class="language-java"><code><span class="token class-name">Mono</span><span class="token generics"><span class="token punctuation">&lt;</span><span class="token class-name">Message</span><span class="token punctuation">></span></span> <span class="token function">toUpperCase</span><span class="token punctuation">(</span><span class="token class-name">String</span> payload<span class="token punctuation">,</span>
                          <span class="token class-name">String</span> clientId<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token class-name">Mono</span><span class="token punctuation">.</span><span class="token function">just</span><span class="token punctuation">(</span>payload<span class="token punctuation">.</span><span class="token function">toUpperCase</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token class-name">Message</span><span class="token operator">::</span><span class="token keyword">new</span><span class="token punctuation">)</span>
            <span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">"toUpperCase "</span> <span class="token operator">+</span> clientId<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>RSocket结果：
<img src="@source/posts/rsocket/images/BDA6063C-2166-4688-8C6F-A786EFDA5152.png" alt="" loading="lazy"></p>
<p>WebFlux结果：
<img src="@source/posts/rsocket/images/4079CD0E-2B00-4A2D-AB45-EE23D44DE2D2.png" alt="" loading="lazy"></p>
<ul>
<li>Request/Stream模式
被测方法：</li>
</ul>
<div class="language-java line-numbers-mode" data-ext="java"><pre v-pre class="language-java"><code><span class="token class-name">Flux</span><span class="token generics"><span class="token punctuation">&lt;</span><span class="token class-name">Character</span><span class="token punctuation">></span></span> <span class="token function">splitString</span><span class="token punctuation">(</span><span class="token class-name">String</span> payload<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token class-name">Flux</span><span class="token punctuation">.</span><span class="token function">interval</span><span class="token punctuation">(</span><span class="token class-name">Duration</span><span class="token punctuation">.</span><span class="token function">ofMillis</span><span class="token punctuation">(</span><span class="token number">20</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span>index <span class="token operator">-></span> payload<span class="token punctuation">.</span><span class="token function">charAt</span><span class="token punctuation">(</span>index<span class="token punctuation">.</span><span class="token function">intValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token punctuation">.</span><span class="token function">take</span><span class="token punctuation">(</span>payload<span class="token punctuation">.</span><span class="token function">length</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
            <span class="token punctuation">.</span><span class="token function">doOnNext</span><span class="token punctuation">(</span><span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token operator">::</span><span class="token function">println</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Rocket结果：
<img src="@source/posts/rsocket/images/54B55F9A-B0BD-44AF-B5FB-27640AD26068.png" alt="" loading="lazy">
WebFlux结果：
<img src="@source/posts/rsocket/images/256A1E39-A534-47EE-9F6F-AC70C9142AC2.png" alt="" loading="lazy"></p>
<ul>
<li>Fire-and-Forget模式
被测方法：</li>
</ul>
<div class="language-java line-numbers-mode" data-ext="java"><pre v-pre class="language-java"><code><span class="token keyword">void</span> <span class="token function">log</span><span class="token punctuation">(</span><span class="token class-name">String</span> message<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    log<span class="token punctuation">.</span><span class="token function">info</span><span class="token punctuation">(</span><span class="token string">"receive log message: {}"</span><span class="token punctuation">,</span> message<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Rocket结果：
<img src="@source/posts/rsocket/images/B9A90DA6-5FF9-4044-AEEA-2DDE8359975D.png" alt="" loading="lazy"></p>
<p>WebFlux结果：
<img src="@source/posts/rsocket/images/F9916732-AEC1-4A31-82D8-6BD371E43ABD.png" alt="" loading="lazy"></p>
<p>从三总压测结果可以看出，RSocket相较于Http具有一定的性能优势。</p>
<h2 id="总结" tabindex="-1"><a class="header-anchor" href="#总结" aria-hidden="true">#</a> 总结</h2>
<p>本文介绍了通过Jmeter中Java Request方式对RSocket接口进行压测的方法，并对RSocket和Spring WebFlux做了性能压测对比，相关代码见<a href="https://github.com/pc-dong/rsocket-demos" target="_blank" rel="noopener noreferrer">GitHub - pc-dong/rsocket-demos<ExternalLinkIcon/></a>。</p>
</div></template>


