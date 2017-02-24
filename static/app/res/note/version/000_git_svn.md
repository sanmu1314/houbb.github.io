> [jianshu](http://www.jianshu.com/p/bfec042349ca)

把第一条理解到位思想到位了做起来才会有的放矢，其他几条都是用的时候才能体会到

1) 最核心的区别Git是分布式的，而Svn不是分布的。


能理解这点，上手会很容易，声明一点Git并不是目前唯一的分布式版本控制系统，还有比如Mercurial等，所以说它们差不许多。
话说回来Git跟Svn一样有自己的集中式版本库和Server端，但Git更倾向于分布式开发，因为每一个开发人员的电脑上都有一个Local Repository,
所以即使没有网络也一样可以Commit，查看历史版本记录，创建项 目分支等操作，等网络再次连接上Push到Server端。

从上面看GIt真的很棒，但是GIt adds Complexity,刚开始使用会有些疑惑，因为需要建两个Repositories(Local Repositories & Remote Repositories),
指令很多，除此之外你需要知道哪些指令在Local Repository，哪些指令在Remote Repository。
   
   

2) Git把内容按元数据方式存储，而SVN是按文件：

因为,.git目录是处于你的机器上的一个克隆版的版本库，它拥有中心版本库上所有的东西，
例如标签，分支，版本记录等。.git目录的体积大小跟.svn比较，你会发现它们差距很大。

3) Git没有一个全局版本号，而SVN有：目前为止这是跟SVN相比Git缺少的最大的一个特征。

4) Git的内容的完整性要优于SVN: GIT的内容存储使用的是SHA-1哈希算法。

这能确保代码内容的完整性，确保在遇到磁盘故障和网络问题时降低对版本库的破坏。

5) Git下载下来后，在OffLine状态下可以看到所有的Log, SVN不可以。

6) 刚开始用时很狗血的一点，SVN必须先Update才能Commit, 忘记了合并时就会出现一些错误，git还是比较少的出现这种情况。

7) 克隆一份全新的目录以同样拥有五个分支来说，SVN是同时复製5个版本的文件,也就是说重复五次同样的动作。

而Git只是获取文件的每个版本的 元素，然后只载入主要的分支(master)在我的经验,克隆一个拥有将近一万个提交(commit),五个分支,
每个分支有大约1500个文件的 SVN,耗了将近一个小时！而Git只用了区区的1分钟！

8) 版本库（repository):SVN只能有一个指定中央版本库。当这个中央版本库有问题时，所有工作成员都一起瘫痪直到版本库维修完毕或者新的版本库设立完成。
而 Git可以有无限个版本库。或者，更正确的说法，每一个Git都是一个版本库，区别是它们是否拥有活跃目录（Git Working Tree）。
如果主要版本库（例如：置於GitHub的版本库）发生了什麼事，工作成员仍然可以在自己的本地版本库（local repository）提交，
等待主要版本库恢复即可。工作成员也可以提交到其他的版本库！

9) 分支（Branch）在SVN，分支是一个完整的目录。且这个目录拥有完整的实际文件。如果工作成员想要开啟新的分支，
那将会影响“全世界”！每个人都会拥有和你一样的分支。如果你的分支是用来进行破坏工作（安检测试），
那将会像传染病一样,你改一个分支，还得让其他人重新切分支重新下载，十分狗血。而 Git，
每个工作成员可以任意在自己的本地版本库开啟无限个分支。举例：当我想尝试破坏自己的程序（安检测试），
并且想保留这些被修改的文件供日后使用， 我可以开一个分支，做我喜欢的事。完全不需担心妨碍其他工作成员。
只要我不合并及提交到主要版本库，没有一个工作成员会被影响。等到我不需要这个分支时，我只要把它从我的本地版本库删除即可。无痛无痒。

Git的分支名是可以使用不同名字的。例如：我的本地分支名为OK，而在主要版本库的名字其实是master。

最值得一提，我可以在Git的任意一个提交点（commit point）开启分支！（其中一个方法是使用gitk –all 可观察整个提交记录，然后在任意点开啟分支。）

10) 提交（Commit）在SVN，当你提交你的完成品时，它将直接记录到中央版本库。
当你发现你的完成品存在严重问题时，你已经无法阻止事情的发生了。如果网路中断，你根本没办法提交！
而Git的提交完全属於本地版本库的活动。而你只需“推”（git push）到主要版本库即可。Git的“推”其实是在执行“同步”（Sync）。

最后总结一下：

SVN的特点是简单，只是需要一个放代码的地方时用是OK的。

Git的特点版本控制可以不依赖网络做任何事情，对分支和合并有更好的支持(当然这是开发者最关心的地方)，不过想各位能更好使用它，需要花点时间尝试下。

























# 乐观锁 or 悲观锁

