这是一个使用ol对后台geoserver服务进行增删改操作的示例。

# 使用方法
1、geoserver中发布图层服务

2、index.js文件开头中配置连接图层服务的相关参数、地图中心点

3、打开页面，进行相关操作

# 相关问题
## 1、获取数据失败
 
 1)确保geoserver允许跨域
 
 2)确保服务连接参数正确

## 2、操作返回 **is read-only**
 
 这个系geoserver权限问题，可以打开geoserver页面，导航到Security-data，然后添加规则，设置对应数据的write权限。

## 3、操作返回No such property: geometry
 
 这个前面以前提到，可以几何字段的字段名，使前后台匹配。

## 4、操作返回Error performing insert: Error inserting features
 
 这个情况比较特殊，有可能是一些属性值不允许插入。比如数据表的某个字段添加了唯一约束，这时再往这个字段写入重复值，将引发以上错误。
