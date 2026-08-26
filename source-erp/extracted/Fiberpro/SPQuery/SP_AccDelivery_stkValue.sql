/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  DC GOODS VALUE QUERY

; Change Person    :  ASLAM

; Last Change Date :  25/12/2025 10.02 AM 

; =============================================  */  

 CREATE PROCEDURE SP_AccDelivery_stkValue (@ID int) AS Update tmp set tmp.StkRate_DC = c.BudRate   from Trs_del1 a inner join Trs_del2  tmp on a.id = tmp.id INNER JOIN StockTable B ON tmp.StockID= B.StockID  inner join Pro_AccBudRate C ON C.OrdID = tmp.OrdId And C.Acc_Type = B.Atype	And C.Acc_Desc = B.Ades And C.Clr = B.ColID	And C.Siz = B.Siz inner join Mas_Dept on A.Prs_Dept=Mas_Dept.DeptID  where ( Mas_DEpt.AccProsDept='Y' or A.Prs_Dept=16)  and tmp.id = @ID

