import { useState } from "react";


function ProductCard(props){
  const [count, setCount] = useState(0);
  return <div>
    <img src={props.img} width={250} height={250}/>
    <p>{props.name}</p>
    <p>{props.price}</p>
    <button onClick={() => setCount(count+1)}>Добавить в корзину</button>
    <p>Количество: {count}</p>
  </div>
}
// function Counter(){
//     const [count, setCount] = useState(0);

//         return(
//             <div>
//                 <p>Счетчик: {count}</p>
//                 <button onClick={() => setCount(count+1)}>+</button>
//                 <button onClick={() => setCount(count-1)}>-</button>
//             </div>
//         )
// }

export default ProductCard;


