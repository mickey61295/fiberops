/*    
;=============================================    
; Author           :  Global Software's    
; Create date      :  20/08/2015    
; Create By        :  Karthick.M  
; Description      :  Meet_Accessories  
; Change Person    :  S.Nasima
; Last Change Date :  31/01/2018 10.50 AM
; =============================================  */  
  
CREATE PROC [dbo].[Meet_Accessories] (@Ordid NVARCHAR(MAX),@Style Varchar(100))  
AS   
BEGIN   
SET NOCOUNT ON  
IF @Style='nothing'  
BEGIN  
  
  
    select (ItemName)as Itmes,  
  
    SUBSTRING(UOM,1,3)as UOM,  
  
    sum(Req_Qty)as REQ_Qty,  
  
    sum(Po_Qty)as PO_Qty,  
  
    sum(Grn_Qty)as GRN_Qty,    
  
    sum(Status)as St,  
  
    sum(Amount) AS Amount,case when sum(Req_Qty) <> 0 then convert(numeric(18,0),(sum(Grn_Qty)/sum(Req_Qty))*100) else 0 End as Per from (  
  
     (select (Acc_Descr)as ItemName,  
  
     (Mas_Uom.Uom)as UOM,  
  
     FLOOR(ROUND(sum(PRO_AccReq.ReqdQty),0))as Req_Qty,    
  
     (0) as Po_Qty,  
  
     (0) as Grn_Qty,  
  
     (0)as Status,0 AS Amount   
  
     from Mas_Acc   
  
      INNER JOIN PRO_AccReq ON Mas_Acc.Id=PRO_AccReq.Acc_Type    
  
      INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID   
  
         and PRO_AccReq.OrdId in (SELECT ID FROM FNSPLITTER(@Ordid))    
  
      Group by Acc_Descr,Mas_Uom.Uom)   
  
      UNION   
  
     (select (Acc_Descr)as ItemName,  
  
     (Mas_Uom.Uom)as UOM,  
  
     (0)as Req_Qty,    
  
      FLOOR(ROUND(sum(Trs_Po5.PoQty),0)) as Po_Qty,  
  
     (0) as Grn_Qty,  
  
     (0)as Status,  
  
      FLOOR(ROUND(sum(Trs_Po5.Amount),2)) from Mas_Acc    
  
        INNER JOIN Trs_Po5 ON Mas_Acc.Id=Trs_Po5.AType   
  
        INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID    
  
        INNER JOIN Mas_AccDes ON Trs_Po5.AType=Mas_AccDes.ID   
  
        and Trs_Po5.OrdId in (SELECT ID FROM FNSPLITTER(@Ordid))    
  
        Group by Acc_Descr,Mas_Uom.Uom)   
  
      UNION   
  
     (Select X.ItemName,X.UOM,sum(x.Req_Qty) as Req_Qty, Sum(X.Po_Qty) as Po_Qty,sum(X.Grn_Qty) as Grn_Qty,  
    
     Floor(sum(x.Status)) as status,0 As Amount From (   
       
     select stocktable.StockID,(Acc_Descr)as ItemName,(Mas_Uom.Uom)as UOM,(0)as Req_Qty,    
            
     (0)as Po_Qty,FLOOR(ROUND(sum(Trs_Grn2.RecKgs),0)) as Grn_Qty,0 as Status,0 AS Amount  
       
     from Mas_Acc INNER JOIN StockTable ON Mas_Acc.Id=StockTable.Atype   
       
     INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID    
       
     INNER JOIN Mas_AccDes ON StockTable.Ades=Mas_AccDes.ID   
       
     INNER JOIN Trs_Grn2 ON StockTable.OrdId=Trs_Grn2.ordid    
       
     and Trs_Grn2.StockId=StockTable.StockId --and Trs_Grn2.StyleNo = stk.StyleNo  
       
     INNER JOIN Trs_Grn1 ON Trs_Grn2.ID=Trs_Grn1.ID    
       
     and Trs_Grn2.ordid in (SELECT ID FROM FNSPLITTER(@Ordid))   
       
     AND Trs_Grn1.GRNType='Acc.Purch'  
       
     Group by StockTable.StockID,Acc_Descr,Mas_Uom.Uom  
  
     Union  
  
     select StockTable.StockID,(Acc_Descr)as ItemName,(Mas_Uom.Uom)as UOM,(0)as Req_Qty, (0)as Po_Qty,0 as Grn_Qty,  
       
     Sum(stk.Kg) as Status,0 As Amount  
  
     --from Vue_StockAbs as stk  inner join StockTable 
       
     from CurrentStock as stk  inner join StockTable   
       
     ON  stk.StockID = StockTable.StockID and stk.ordid = StockTable.OrdID   
       
     INNER JOIN Mas_Acc on mas_acc.ID = StockTable.Atype  
       
     INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID    
       
     INNER JOIN Mas_AccDes ON StockTable.Ades=Mas_AccDes.ID   
       
     and stocktable.ordid in (SELECT ID FROM FNSPLITTER(@Ordid))   
       
     AND stk.kg > 0 group by StockTable.StockID,Acc_Descr,UOM  
       
     ) X group by X.ItemName,X.UOM))  
  
   A group by ItemName,UOM  
  
   Order by ItemName  
  
  END  
  
 ELSE  
  
  BEGIN  
  
    select (ItemName)as Itmes,  
  
    SUBSTRING(UOM,1,3)as UOM,  
  
    sum(Req_Qty)as REQ_Qty,  
  
    sum(Po_Qty)as PO_Qty,  
  
    sum(Grn_Qty)as GRN_Qty,   
  
    sum(Status)as St,sum(Amount) AS Amount,case when sum(Req_Qty) <> 0 then convert(numeric(18,0),(sum(Grn_Qty)/sum(Req_Qty))*100) else 0 End as Per from ((select (Acc_Descr)as ItemName,  
  
    (Mas_Uom.Uom)as UOM,  
  
    FLOOR(ROUND(sum(PRO_AccReq.ReqdQty),0))as Req_Qty,    
  
    (0) as Po_Qty,  
  
    (0) as Grn_Qty,  
  
    (0)as Status,  
  
    0 AS Amount from Mas_Acc   
  
     INNER JOIN PRO_AccReq ON Mas_Acc.Id=PRO_AccReq.Acc_Type   
  
     INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID   
  
     INNER JOIN Mas_AccDes ON PRO_AccReq.Acc_Type=Mas_AccDes.AccTypeID   
  
        and PRO_AccReq.Acc_Desc=Mas_AccDes.ID   
  
        and Mas_AccDes.AccTypeID=Mas_Acc.Id   
  
        and PRO_AccReq.OrdId in (SELECT ID FROM FNSPLITTER(@Ordid))   
  
        and PRO_AccReq.StyleNo=@Style  
  
     Group by Acc_Descr,Mas_Uom.Uom)   
  
  
       UNION   
    
    (select (Acc_Descr)as ItemName,  
  
    (Mas_Uom.Uom)as UOM,  
  
    (0)as Req_Qty,    
  
    FLOOR(ROUND(sum(Trs_Po5.PoQty),0)) as Po_Qty,  
  
    (0) as Grn_Qty,  
  
    (0)as Status,FLOOR(ROUND(sum(Trs_Po5.Amount),2)) AS Amount from Mas_Acc   
  
    INNER JOIN Trs_Po5 ON Mas_Acc.Id=Trs_Po5.AType   
  
    INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID  
  
    INNER JOIN Mas_AccDes ON Trs_Po5.AType=Mas_AccDes.ID   
  
       and Trs_Po5.OrdId in (SELECT ID FROM FNSPLITTER(@Ordid))   
  
       and Trs_Po5.StyleNo = @Style    
  
    Group by Acc_Descr,Mas_Uom.Uom)   
  
  
  
    UNION   
  
      
    (Select X.ItemName,X.UOM,sum(x.Req_Qty) as Req_Qty, Sum(X.Po_Qty) as Po_Qty,sum(X.Grn_Qty) as Grn_Qty,  
    
    Floor(sum(x.Status)) as status,0 As Amount From (   
       
    select stocktable.StockID,(Acc_Descr)as ItemName,(Mas_Uom.Uom)as UOM,(0)as Req_Qty,    
            
    (0)as Po_Qty,FLOOR(ROUND(sum(Trs_Grn2.RecKgs),0)) as Grn_Qty,0 as Status,0 AS Amount  
       
    from Mas_Acc INNER JOIN StockTable ON Mas_Acc.Id=StockTable.Atype   
       
    INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID    
       
    INNER JOIN Mas_AccDes ON StockTable.Ades=Mas_AccDes.ID   
       
    INNER JOIN Trs_Grn2 ON StockTable.OrdId=Trs_Grn2.ordid    
       
    and Trs_Grn2.StockId=StockTable.StockId --and Trs_Grn2.StyleNo = stk.StyleNo  
       
    INNER JOIN Trs_Grn1 ON Trs_Grn2.ID=Trs_Grn1.ID    
       
    and Trs_Grn2.ordid in (SELECT ID FROM FNSPLITTER(@Ordid))   
       
    AND Trs_Grn1.GRNType='Acc.Purch' and Trs_Grn2.StyleNo=@Style   
       
    Group by StockTable.StockID,Acc_Descr,Mas_Uom.Uom  
  
    Union  
  
    select StockTable.StockID,(Acc_Descr)as ItemName,(Mas_Uom.Uom)as UOM,(0)as Req_Qty, (0)as Po_Qty,0 as Grn_Qty,  
       
    Sum(stk.Kg) as Status,0 As Amount  
  
   -- from Vue_StockAbs as stk  inner join StockTable   
    from CurrentStock as stk  inner join StockTable   
       
    ON  stk.StockID = StockTable.StockID and stk.ordid = StockTable.OrdID   
       
    INNER JOIN Mas_Acc on mas_acc.ID = StockTable.Atype  
       
    INNER JOIN Mas_Uom ON Mas_Acc.UomId=Mas_Uom.UomID    
       
    INNER JOIN Mas_AccDes ON StockTable.Ades=Mas_AccDes.ID   
       
    and stocktable.ordid in (SELECT ID FROM FNSPLITTER(@Ordid)) and stk.StyleNo = @Style   
       
    AND stk.kg > 0 group by  StockTable.StockID,Acc_Descr,UOM  
       
    ) X group by X.ItemName,X.UOM)) A   
  
    group by ItemName,UOM  
  
    Order by ItemName  
  
  END  
  
 SET NOCOUNT OFF  
  
END  
  
  
  
  
