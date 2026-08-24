/*;=============================================   

; Author           :  Global Software's    

; Create date      :  25/12/2025    

; Create By        :  KIRUTHIKA  

; Description      :  DC GOODS VALUE QUERY (ACC PROCESS)

; Change Person    :  KIRUTHIKA

; Last Change Date :  25/12/2025 10.02 AM 

; =============================================  */  

CREATE PROCEDURE SP_AccProcessDelivery_stkValue (@ID int) AS Update tmp set tmp.StkRate_DC = (c.BudRate+tmp.prs_rate)   from Trs_del1 a inner join Trs_del2  tmp on a.id = tmp.id INNER JOIN StockTable B ON tmp.StockID= B.StockID  inner join Pro_AccBudRate 
C ON C.OrdID = tmp.OrdId And C.Acc_Type = B.Atype	And C.Acc_Desc = B.Ades And C.Clr = B.ColID	And C.Siz = B.Siz inner join Mas_Dept on A.Prs_Dept=Mas_Dept.DeptID inner join Trs_po5 on trs_po5.OrdID=Tmp.OrdId and trs_po5.AType=B.Atype and Trs_po5.Ades=B.Ades where ( Mas_DEpt.AccProsDept='Y' or A.Prs_Dept<>16)  and tmp.id = @ID
