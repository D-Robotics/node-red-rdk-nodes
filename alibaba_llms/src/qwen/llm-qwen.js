module.exports = function(RED) {
    const OpenAI = require('openai').default;
    const marked = require("marked");

    RED.log.info('Loading alibaba-llms qwen...')

    function QwenNode(config){
        RED.nodes.createNode(this,config);

        const apiKey = config.apikey;
        const node = this;

        if(apiKey === ""){
            node.status({
                fill: "yellow",
                shape: "dot",
                text: "API Key is required!"
            })
        }

        const openai = new OpenAI({
                // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx",
                apiKey: apiKey,
                baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
            }
        );

        async function invokeQwen(question){
            const completion = await openai.chat.completions.create({
                model: "qwen-plus",  //模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
                messages: [
                    { role: "user", content: question }
                ],
            });
            node.send({
                payload: marked.parse(completion.choices[0].message.content)
            })
        }

        node.on('close', () => {
            node.status({})
        })
        node.on('input', async function(msg){
            if(apiKey === ""){
                return;
            }
            else{
                node.status({})
            }

            if(msg?.payload && typeof msg.payload === 'string' && msg.payload !== "" && msg.payload.indexOf('blob') < 0){
                await invokeQwen(msg.payload);
            }
            else{
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "invalid input"
                });
                setTimeout(() => {
                    node.status({});
                }, 5000)
            }
        })
    }

    RED.nodes.registerType("alibaba-llms Qwen", QwenNode);

}